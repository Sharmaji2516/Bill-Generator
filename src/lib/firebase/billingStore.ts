import {
  BillingAuditEntry,
  BillingCustomer,
  BillingDocumentType,
  BillingInvoice,
  BillingPayment,
  BillingProduct,
  BusinessId,
  BusinessProfile,
  InvoiceStatus,
} from '@/types';
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from './admin';
import { DEFAULT_BUSINESS_PROFILES, getDocumentPrefix } from '@/lib/billing/businesses';
import { calculateInvoiceTotals, getIndianFinancialYear, round2 } from '@/lib/billing/gstEngine';
import { generateSecureId } from '@/lib/mail/mailer';

/**
 * Dedicated Firestore collection mandated by the user.
 * IMPORTANT: Application code MUST NEVER auto-create this collection.
 * The user creates `billing_details` manually in Firebase Console.
 */
export const BILLING_COLLECTION = 'billing_details';

export class BillingCollectionNotReadyError extends Error {
  code = 'COLLECTION_NOT_INITIALIZED';
  constructor(message?: string) {
    super(
      message ||
        'The Firestore collection "billing_details" has not been initialized in Firebase Console yet. Please create it manually (with an initial document such as _meta) before saving records.'
    );
    this.name = 'BillingCollectionNotReadyError';
  }
}

export interface CollectionStatus {
  firebaseConfigured: boolean;
  collectionReady: boolean;
  docCount: number;
  message: string;
}

/**
 * Checks whether Firebase Admin is configured and whether `billing_details`
 * already contains at least one document (created manually by the administrator).
 * Reading `.limit(1).get()` never creates a collection in Firestore.
 */
export async function checkBillingCollectionStatus(): Promise<CollectionStatus> {
  if (!isFirebaseAdminConfigured()) {
    return {
      firebaseConfigured: false,
      collectionReady: false,
      docCount: 0,
      message: 'Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not configured in .env.local.',
    };
  }

  const db = getFirebaseAdminDb();
  if (!db) {
    return {
      firebaseConfigured: false,
      collectionReady: false,
      docCount: 0,
      message: 'Firebase Admin SDK could not initialize.',
    };
  }

  try {
    const snap = await db.collection(BILLING_COLLECTION).limit(1).get();
    if (snap.empty) {
      return {
        firebaseConfigured: true,
        collectionReady: false,
        docCount: 0,
        message: 'Waiting for manual creation of collection "billing_details" in Firebase Console (add an initial document like _meta).',
      };
    }
    return {
      firebaseConfigured: true,
      collectionReady: true,
      docCount: snap.size,
      message: 'Connected to chittor-tech / billing_details',
    };
  } catch (err) {
    return {
      firebaseConfigured: true,
      collectionReady: false,
      docCount: 0,
      message: err instanceof Error ? err.message : 'Unable to query billing_details.',
    };
  }
}

/**
 * Guards every write operation so application code never creates `billing_details`.
 */
async function requireReadyBillingDb() {
  const db = getFirebaseAdminDb();
  if (!db) {
    throw new Error('Firebase Admin SDK is not configured in .env.local.');
  }
  const probe = await db.collection(BILLING_COLLECTION).limit(1).get();
  if (probe.empty) {
    throw new BillingCollectionNotReadyError();
  }
  return db;
}

async function writeAuditEntry(
  businessId: BusinessId,
  entry: Omit<BillingAuditEntry, 'id' | 'docType' | 'businessId' | 'createdAt'>
): Promise<void> {
  const db = getFirebaseAdminDb();
  if (!db) return;
  const id = generateSecureId('audit');
  const payload: BillingAuditEntry = {
    id,
    docType: 'audit',
    businessId,
    ...entry,
    createdAt: new Date().toISOString(),
  };
  await db.collection(BILLING_COLLECTION).doc(id).set(payload);
}

/* ─── BUSINESS PROFILES ────────────────────────────────────────────────────── */

export async function listBusinessProfiles(): Promise<{
  businesses: BusinessProfile[];
  status: CollectionStatus;
}> {
  const status = await checkBillingCollectionStatus();
  const merged: Record<string, BusinessProfile> = { ...DEFAULT_BUSINESS_PROFILES };

  if (status.firebaseConfigured && status.collectionReady) {
    const db = getFirebaseAdminDb();
    if (db) {
      const snap = await db
        .collection(BILLING_COLLECTION)
        .where('docType', '==', 'business')
        .get();
      snap.forEach((docSnap) => {
        const data = docSnap.data() as BusinessProfile;
        if (data?.id) {
          merged[data.id] = {
            ...(merged[data.id] || {}),
            ...data,
          };
        }
      });
    }
  }

  return {
    businesses: Object.values(merged),
    status,
  };
}

export async function getBusinessProfile(businessId: BusinessId): Promise<BusinessProfile> {
  const { businesses } = await listBusinessProfiles();
  return businesses.find((b) => b.id === businessId) || DEFAULT_BUSINESS_PROFILES.chittortech;
}

export async function saveBusinessProfile(
  profile: BusinessProfile,
  actorEmail: string
): Promise<BusinessProfile> {
  const db = await requireReadyBillingDb();
  const docId = `biz_${profile.id}`;
  const updated: BusinessProfile = {
    ...profile,
    docType: 'business',
    updatedAt: new Date().toISOString(),
  };
  await db.collection(BILLING_COLLECTION).doc(docId).set(updated, { merge: true });

  await writeAuditEntry(profile.id, {
    action: 'BUSINESS_UPDATED',
    entityType: 'business',
    entityId: profile.id,
    summary: `Updated business profile for ${profile.tradeName}`,
    actorEmail,
  });

  return updated;
}

/* ─── CUSTOMERS ────────────────────────────────────────────────────────────── */

export async function listCustomers(businessId: BusinessId): Promise<BillingCustomer[]> {
  const db = getFirebaseAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(BILLING_COLLECTION)
    .where('docType', '==', 'customer')
    .get();

  const items: BillingCustomer[] = [];
  snap.forEach((d) => {
    const data = d.data() as BillingCustomer;
    if (data.businessId === businessId) {
      items.push(data);
    }
  });
  return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function saveCustomer(
  input: Omit<BillingCustomer, 'id' | 'docType' | 'createdAt' | 'updatedAt'> & { id?: string },
  actorEmail: string
): Promise<BillingCustomer> {
  const db = await requireReadyBillingDb();
  const now = new Date().toISOString();
  const isUpdate = Boolean(input.id);
  const id = input.id || generateSecureId('cust');
  const docRef = db.collection(BILLING_COLLECTION).doc(id);

  let createdAt = now;
  if (isUpdate) {
    const existing = await docRef.get();
    if (existing.exists) {
      const existingData = existing.data() as BillingCustomer;
      if (existingData.businessId !== input.businessId) {
        throw new Error('Business isolation violation: customer belongs to another business.');
      }
      createdAt = existingData.createdAt || now;
    }
  }

  const customer: BillingCustomer = {
    ...input,
    id,
    docType: 'customer',
    createdAt,
    updatedAt: now,
  };

  await docRef.set(customer, { merge: true });
  await writeAuditEntry(input.businessId, {
    action: 'CUSTOMER_SAVED',
    entityType: 'customer',
    entityId: id,
    summary: `${isUpdate ? 'Updated' : 'Created'} customer ${customer.name}`,
    actorEmail,
  });

  return customer;
}

export async function deleteCustomer(
  id: string,
  businessId: BusinessId,
  actorEmail: string,
  reason?: string
): Promise<void> {
  const db = await requireReadyBillingDb();
  const docRef = db.collection(BILLING_COLLECTION).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error('Customer record not found.');
  }
  const data = snap.data() as BillingCustomer;
  if (data.docType !== 'customer' || data.businessId !== businessId) {
    throw new Error('Unauthorized or mismatched business for customer deletion.');
  }
  await docRef.delete();
  await writeAuditEntry(businessId, {
    action: 'CUSTOMER_DELETED',
    entityType: 'customer',
    entityId: id,
    summary: `Deleted customer ${data.name}`,
    reason,
    actorEmail,
  });
}

/* ─── PRODUCTS & SERVICES ──────────────────────────────────────────────────── */

export async function listProducts(businessId: BusinessId): Promise<BillingProduct[]> {
  const db = getFirebaseAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(BILLING_COLLECTION)
    .where('docType', '==', 'product')
    .get();

  const items: BillingProduct[] = [];
  snap.forEach((d) => {
    const data = d.data() as BillingProduct;
    if (data.businessId === businessId) {
      items.push(data);
    }
  });
  return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function saveProduct(
  input: Omit<BillingProduct, 'id' | 'docType' | 'createdAt' | 'updatedAt'> & { id?: string },
  actorEmail: string
): Promise<BillingProduct> {
  const db = await requireReadyBillingDb();
  const now = new Date().toISOString();
  const isUpdate = Boolean(input.id);
  const id = input.id || generateSecureId('prod');
  const docRef = db.collection(BILLING_COLLECTION).doc(id);

  let createdAt = now;
  if (isUpdate) {
    const existing = await docRef.get();
    if (existing.exists) {
      const existingData = existing.data() as BillingProduct;
      if (existingData.businessId !== input.businessId) {
        throw new Error('Business isolation violation: product belongs to another business.');
      }
      createdAt = existingData.createdAt || now;
    }
  }

  const product: BillingProduct = {
    ...input,
    id,
    docType: 'product',
    createdAt,
    updatedAt: now,
  };

  await docRef.set(product, { merge: true });
  await writeAuditEntry(input.businessId, {
    action: 'PRODUCT_SAVED',
    entityType: 'product',
    entityId: id,
    summary: `${isUpdate ? 'Updated' : 'Created'} ${product.itemType} "${product.name}"`,
    actorEmail,
  });

  return product;
}

export async function deleteProduct(
  id: string,
  businessId: BusinessId,
  actorEmail: string,
  reason?: string
): Promise<void> {
  const db = await requireReadyBillingDb();
  const docRef = db.collection(BILLING_COLLECTION).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error('Product/Service record not found.');
  }
  const data = snap.data() as BillingProduct;
  if (data.docType !== 'product' || data.businessId !== businessId) {
    throw new Error('Unauthorized or mismatched business for product deletion.');
  }
  await docRef.delete();
  await writeAuditEntry(businessId, {
    action: 'PRODUCT_DELETED',
    entityType: 'product',
    entityId: id,
    summary: `Deleted ${data.itemType} "${data.name}"`,
    reason,
    actorEmail,
  });
}

/* ─── INVOICES, QUOTATIONS & ATOMIC NUMBERING ──────────────────────────────── */

export async function listInvoices(businessId?: BusinessId): Promise<BillingInvoice[]> {
  const db = getFirebaseAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(BILLING_COLLECTION)
    .where('docType', '==', 'invoice')
    .get();

  const items: BillingInvoice[] = [];
  snap.forEach((d) => {
    const data = d.data() as BillingInvoice;
    if (!businessId || data.businessId === businessId) {
      items.push(data);
    }
  });
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function getNextSuggestedNumber(
  businessId: BusinessId,
  docType: BillingDocumentType,
  issueDate?: string
): Promise<{ invoiceNumber: string; financialYear: string }> {
  const business = await getBusinessProfile(businessId);
  const fy = getIndianFinancialYear(issueDate);
  const prefix = getDocumentPrefix(business, docType);
  const db = getFirebaseAdminDb();
  if (!db) {
    return { invoiceNumber: `${prefix}/${fy}/001`, financialYear: fy };
  }

  const counterKey = `ctr_${businessId}_${fy}_${docType}`;
  try {
    const snap = await db.collection(BILLING_COLLECTION).doc(counterKey).get();
    const nextSeq = snap.exists ? Number(snap.data()?.lastSeq || 0) + 1 : 1;
    return {
      invoiceNumber: `${prefix}/${fy}/${String(nextSeq).padStart(3, '0')}`,
      financialYear: fy,
    };
  } catch {
    return { invoiceNumber: `${prefix}/${fy}/001`, financialYear: fy };
  }
}

export async function saveInvoice(
  input: Omit<
    BillingInvoice,
    | 'id'
    | 'docType'
    | 'businessSnapshot'
    | 'subtotal'
    | 'itemDiscountTotal'
    | 'invoiceDiscountAmount'
    | 'discountTotal'
    | 'taxableValue'
    | 'cgstTotal'
    | 'sgstTotal'
    | 'igstTotal'
    | 'taxTotal'
    | 'roundOff'
    | 'grandTotal'
    | 'balanceDue'
    | 'amountInWords'
    | 'createdBy'
    | 'createdAt'
    | 'updatedAt'
    | 'items'
    | 'invoiceNumber'
    | 'financialYear'
  > & {
    id?: string;
    invoiceNumber?: string;
    financialYear?: string;
    items: Parameters<typeof calculateInvoiceTotals>[0];
    amountPaid?: number;
    editReason?: string;
  },
  actorEmail: string
): Promise<BillingInvoice> {
  const db = await requireReadyBillingDb();
  const businessSnapshot = await getBusinessProfile(input.businessId);
  const now = new Date().toISOString();
  const isUpdate = Boolean(input.id);
  const invoiceDocId = input.id || generateSecureId('inv');

  // Server-side deterministic GST & total recalculation (never trust client totals)
  const calc = calculateInvoiceTotals(input.items, input.gstConfig);
  const fy = input.financialYear || getIndianFinancialYear(input.issueDate);
  const prefix = getDocumentPrefix(businessSnapshot, input.documentType);

  const amountPaid =
    input.status === 'PAID'
      ? calc.grandTotal
      : round2(Math.min(calc.grandTotal, Math.max(0, Number(input.amountPaid) || 0)));
  const balanceDue = round2(Math.max(0, calc.grandTotal - amountPaid));

  let resolvedStatus: InvoiceStatus = input.status;
  if (resolvedStatus !== 'CANCELLED' && resolvedStatus !== 'DRAFT') {
    if (balanceDue <= 0 && calc.grandTotal > 0) {
      resolvedStatus = 'PAID';
    } else if (amountPaid > 0 && balanceDue > 0) {
      resolvedStatus = 'PARTIAL';
    }
  }

  const saved = await db.runTransaction(async (tx) => {
    const invRef = db.collection(BILLING_COLLECTION).doc(invoiceDocId);
    const existingSnap = isUpdate ? await tx.get(invRef) : null;

    let createdAt = now;
    let createdBy = actorEmail;
    let finalInvoiceNumber = (input.invoiceNumber || '').trim();

    if (existingSnap && existingSnap.exists) {
      const existingData = existingSnap.data() as BillingInvoice;
      if (existingData.businessId !== input.businessId) {
        throw new Error('Business isolation violation: invoice belongs to another business.');
      }
      if (existingData.status === 'CANCELLED') {
        throw new Error('Cancelled invoices cannot be edited.');
      }
      createdAt = existingData.createdAt || now;
      createdBy = existingData.createdBy || actorEmail;
      if (!finalInvoiceNumber) {
        finalInvoiceNumber = existingData.invoiceNumber;
      }
    } else {
      // Allocate atomic counter inside transaction for new documents
      const counterId = `ctr_${input.businessId}_${fy}_${input.documentType}`;
      const counterRef = db.collection(BILLING_COLLECTION).doc(counterId);
      const counterSnap = await tx.get(counterRef);
      const prevSeq = counterSnap.exists ? Number(counterSnap.data()?.lastSeq || 0) : 0;
      const nextSeq = prevSeq + 1;

      if (!finalInvoiceNumber) {
        finalInvoiceNumber = `${prefix}/${fy}/${String(nextSeq).padStart(3, '0')}`;
      }

      tx.set(
        counterRef,
        {
          id: counterId,
          docType: 'counter',
          businessId: input.businessId,
          financialYear: fy,
          documentType: input.documentType,
          lastSeq: nextSeq,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    const invoiceRecord: BillingInvoice = {
      id: invoiceDocId,
      docType: 'invoice',
      businessId: input.businessId,
      documentType: input.documentType,
      templateId: input.templateId,
      invoiceNumber: finalInvoiceNumber,
      financialYear: fy,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      status: resolvedStatus,
      currencySymbol: input.currencySymbol || businessSnapshot.defaultCurrency || '₹',
      customer: input.customer,
      businessSnapshot,
      gstConfig: input.gstConfig,
      items: calc.items,
      subtotal: calc.subtotal,
      itemDiscountTotal: calc.itemDiscountTotal,
      invoiceDiscountAmount: calc.invoiceDiscountAmount,
      discountTotal: calc.discountTotal,
      taxableValue: calc.taxableValue,
      cgstTotal: calc.cgstTotal,
      sgstTotal: calc.sgstTotal,
      igstTotal: calc.igstTotal,
      taxTotal: calc.taxTotal,
      roundOff: calc.roundOff,
      grandTotal: calc.grandTotal,
      amountPaid,
      balanceDue,
      amountInWords: calc.amountInWords,
      paymentMethod: input.paymentMethod,
      paymentInfo: input.paymentInfo,
      terms: input.terms,
      notes: input.notes,
      digitalSeal: input.digitalSeal,
      createdBy,
      createdAt,
      updatedAt: now,
    };

    tx.set(invRef, invoiceRecord, { merge: true });
    return invoiceRecord;
  });

  await writeAuditEntry(input.businessId, {
    action: isUpdate ? 'INVOICE_UPDATED' : 'INVOICE_CREATED',
    entityType: 'invoice',
    entityId: saved.id,
    summary: `${isUpdate ? 'Updated' : 'Issued'} ${saved.documentType} ${saved.invoiceNumber} (${saved.currencySymbol}${saved.grandTotal.toFixed(2)})`,
    reason: input.editReason,
    actorEmail,
  });

  return saved;
}

export async function updateInvoiceStatus(
  id: string,
  businessId: BusinessId,
  newStatus: InvoiceStatus,
  actorEmail: string,
  reason?: string
): Promise<BillingInvoice> {
  const db = await requireReadyBillingDb();
  const invRef = db.collection(BILLING_COLLECTION).doc(id);
  const now = new Date().toISOString();

  const updated = await db.runTransaction(async (tx) => {
    const snap = await tx.get(invRef);
    if (!snap.exists) throw new Error('Invoice not found.');
    const existing = snap.data() as BillingInvoice;
    if (existing.docType !== 'invoice' || existing.businessId !== businessId) {
      throw new Error('Unauthorized or mismatched business for invoice update.');
    }

    const amountPaid =
      newStatus === 'PAID'
        ? existing.grandTotal
        : newStatus === 'UNPAID'
        ? 0
        : existing.amountPaid;
    const balanceDue =
      newStatus === 'CANCELLED'
        ? 0
        : round2(Math.max(0, existing.grandTotal - amountPaid));

    const next: BillingInvoice = {
      ...existing,
      status: newStatus,
      amountPaid,
      balanceDue,
      ...(newStatus === 'CANCELLED'
        ? { cancellationReason: reason || 'Cancelled by administrator', cancelledAt: now }
        : {}),
      updatedAt: now,
    };
    tx.set(invRef, next, { merge: true });
    return next;
  });

  await writeAuditEntry(businessId, {
    action: newStatus === 'CANCELLED' ? 'INVOICE_CANCELLED' : 'INVOICE_STATUS_CHANGED',
    entityType: 'invoice',
    entityId: id,
    summary: `Changed ${updated.invoiceNumber} status to ${newStatus}`,
    reason,
    actorEmail,
  });

  return updated;
}

export async function deleteInvoice(
  id: string,
  businessId: BusinessId,
  actorEmail: string,
  reason?: string
): Promise<void> {
  const db = await requireReadyBillingDb();
  const invRef = db.collection(BILLING_COLLECTION).doc(id);
  const snap = await invRef.get();
  if (!snap.exists) throw new Error('Invoice not found.');
  const existing = snap.data() as BillingInvoice;
  if (existing.docType !== 'invoice' || existing.businessId !== businessId) {
    throw new Error('Unauthorized or mismatched business for invoice deletion.');
  }

  await invRef.delete();
  await writeAuditEntry(businessId, {
    action: 'INVOICE_DELETED',
    entityType: 'invoice',
    entityId: id,
    summary: `Deleted ${existing.documentType} ${existing.invoiceNumber}`,
    reason,
    actorEmail,
  });
}

/* ─── PAYMENTS ─────────────────────────────────────────────────────────────── */

export async function listPayments(businessId: BusinessId): Promise<BillingPayment[]> {
  const db = getFirebaseAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(BILLING_COLLECTION)
    .where('docType', '==', 'payment')
    .get();

  const items: BillingPayment[] = [];
  snap.forEach((d) => {
    const data = d.data() as BillingPayment;
    if (data.businessId === businessId) items.push(data);
  });
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function recordPayment(
  input: Omit<BillingPayment, 'id' | 'docType' | 'invoiceNumber' | 'customerId' | 'customerName' | 'recordedBy' | 'createdAt'>,
  actorEmail: string
): Promise<{ payment: BillingPayment; invoice: BillingInvoice }> {
  const db = await requireReadyBillingDb();
  const payId = generateSecureId('pay');
  const now = new Date().toISOString();

  const result = await db.runTransaction(async (tx) => {
    const invRef = db.collection(BILLING_COLLECTION).doc(input.invoiceId);
    const invSnap = await tx.get(invRef);
    if (!invSnap.exists) throw new Error('Target invoice not found.');
    const inv = invSnap.data() as BillingInvoice;
    if (inv.docType !== 'invoice' || inv.businessId !== input.businessId) {
      throw new Error('Business isolation violation: invoice belongs to another business.');
    }
    if (inv.status === 'CANCELLED') {
      throw new Error('Cannot record a payment against a cancelled invoice.');
    }

    const payAmt = round2(input.amount);
    const nextPaid = round2(Math.min(inv.grandTotal, (inv.amountPaid || 0) + payAmt));
    const nextBalance = round2(Math.max(0, inv.grandTotal - nextPaid));
    const nextStatus: InvoiceStatus =
      nextBalance <= 0 ? 'PAID' : nextPaid > 0 ? 'PARTIAL' : inv.status;

    const payment: BillingPayment = {
      id: payId,
      docType: 'payment',
      businessId: input.businessId,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customer.customerId,
      customerName: inv.customer.name,
      amount: payAmt,
      method: input.method,
      referenceNo: input.referenceNo,
      paymentDate: input.paymentDate,
      notes: input.notes,
      recordedBy: actorEmail,
      createdAt: now,
    };

    const updatedInvoice: BillingInvoice = {
      ...inv,
      amountPaid: nextPaid,
      balanceDue: nextBalance,
      status: nextStatus,
      updatedAt: now,
    };

    tx.set(db.collection(BILLING_COLLECTION).doc(payId), payment);
    tx.set(invRef, updatedInvoice, { merge: true });

    return { payment, invoice: updatedInvoice };
  });

  await writeAuditEntry(input.businessId, {
    action: 'PAYMENT_RECORDED',
    entityType: 'payment',
    entityId: payId,
    summary: `Recorded ₹${result.payment.amount.toFixed(2)} payment for ${result.invoice.invoiceNumber}`,
    actorEmail,
  });

  return result;
}

export async function deletePayment(
  paymentId: string,
  businessId: BusinessId,
  actorEmail: string,
  reason?: string
): Promise<void> {
  const db = await requireReadyBillingDb();
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const payRef = db.collection(BILLING_COLLECTION).doc(paymentId);
    const paySnap = await tx.get(payRef);
    if (!paySnap.exists) throw new Error('Payment record not found.');
    const pay = paySnap.data() as BillingPayment;
    if (pay.docType !== 'payment' || pay.businessId !== businessId) {
      throw new Error('Unauthorized or mismatched business for payment deletion.');
    }

    const invRef = db.collection(BILLING_COLLECTION).doc(pay.invoiceId);
    const invSnap = await tx.get(invRef);
    if (invSnap.exists) {
      const inv = invSnap.data() as BillingInvoice;
      const nextPaid = round2(Math.max(0, (inv.amountPaid || 0) - pay.amount));
      const nextBalance = round2(Math.max(0, inv.grandTotal - nextPaid));
      const nextStatus: InvoiceStatus =
        inv.status === 'CANCELLED'
          ? 'CANCELLED'
          : nextPaid <= 0
          ? 'UNPAID'
          : nextBalance > 0
          ? 'PARTIAL'
          : 'PAID';
      tx.set(
        invRef,
        {
          amountPaid: nextPaid,
          balanceDue: nextBalance,
          status: nextStatus,
          updatedAt: now,
        },
        { merge: true }
      );
    }
    tx.delete(payRef);
  });

  await writeAuditEntry(businessId, {
    action: 'PAYMENT_DELETED',
    entityType: 'payment',
    entityId: paymentId,
    summary: `Removed payment record ${paymentId}`,
    reason,
    actorEmail,
  });
}

/* ─── TERMS & AUDIT LOGS ───────────────────────────────────────────────────── */

export async function listAuditLogs(businessId: BusinessId, limitCount = 50): Promise<BillingAuditEntry[]> {
  const db = getFirebaseAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(BILLING_COLLECTION)
    .where('docType', '==', 'audit')
    .get();

  const items: BillingAuditEntry[] = [];
  snap.forEach((d) => {
    const data = d.data() as BillingAuditEntry;
    if (data.businessId === businessId) items.push(data);
  });
  return items
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, limitCount);
}

export async function getSavedTermsDocument(businessId: BusinessId): Promise<{
  businessId: BusinessId;
  clientName: string;
  effectiveDate: string;
  content: string;
  updatedAt?: string;
} | null> {
  const db = getFirebaseAdminDb();
  if (!db) return null;
  const snap = await db.collection(BILLING_COLLECTION).doc(`terms_${businessId}`).get();
  if (!snap.exists) return null;
  return snap.data() as {
    businessId: BusinessId;
    clientName: string;
    effectiveDate: string;
    content: string;
    updatedAt?: string;
  };
}

export async function saveTermsDocument(
  businessId: BusinessId,
  payload: { clientName: string; effectiveDate: string; content: string },
  actorEmail: string
) {
  const db = await requireReadyBillingDb();
  const docId = `terms_${businessId}`;
  const data = {
    id: docId,
    docType: 'terms',
    businessId,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  await db.collection(BILLING_COLLECTION).doc(docId).set(data, { merge: true });
  await writeAuditEntry(businessId, {
    action: 'TERMS_SAVED',
    entityType: 'terms',
    entityId: docId,
    summary: `Saved Terms & Conditions document for ${businessId}`,
    actorEmail,
  });
  return data;
}

