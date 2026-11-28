export type BusinessId = 'chittortech' | 'mewari_achaar' | 'visit_chittorgarh' | string;

export type BillingDocumentType =
  | 'TAX_INVOICE'
  | 'SERVICE_INVOICE'
  | 'QUOTATION'
  | 'PROFORMA_INVOICE'
  | 'PAYMENT_RECEIPT'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE';

export type InvoiceTemplateId =
  | 'gst_tax'
  | 'service_classic'
  | 'modern'
  | 'mewari'
  | 'terms';

export type InvoiceStatus =
  | 'DRAFT'
  | 'UNPAID'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type GstTaxType = 'CGST_SGST' | 'IGST' | 'EXEMPT';

export type DiscountType = 'NONE' | 'PERCENT' | 'FIXED';

export type PaymentMethod =
  | 'Bank Transfer'
  | 'UPI / PhonePe / GPay'
  | 'Cash'
  | 'Cheque'
  | 'Credit Card'
  | 'Other';

export interface BusinessProfile {
  id: BusinessId;
  docType?: 'business';
  tradeName: string;
  legalName: string;
  tagline: string;
  isParent: boolean;
  parentBusinessId: BusinessId | null;
  parentBusinessName: string | null;
  logoUrl: string;
  address: string;
  state: string;
  stateCode: string;
  gstin: string;
  pan: string;
  udyamRegNo: string;
  email: string;
  phone: string;
  website: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  invoicePrefix: string;
  quotationPrefix: string;
  proformaPrefix: string;
  receiptPrefix: string;
  creditNotePrefix: string;
  debitNotePrefix: string;
  defaultTemplate: InvoiceTemplateId;
  defaultGstRate: number;
  gstRegistered: boolean;
  defaultCurrency: string;
  authorizedSignatory: string;
  paymentInstructions: string;
  defaultTerms: string[];
  invoiceFooter: string;
  complianceNote: string;
  accentColor: string;
  updatedAt?: string;
}

export interface BillingCustomer {
  id: string;
  docType: 'customer';
  businessId: BusinessId;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  address: string;
  state: string;
  stateCode: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingProduct {
  id: string;
  docType: 'product';
  businessId: BusinessId;
  name: string;
  description: string;
  itemType: 'service' | 'product';
  hsnSac: string;
  unit: string;
  defaultWeight?: string;
  price: number;
  gstRate: number;
  category: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItemInput {
  id: string;
  productId?: string;
  description: string;
  hsnSac?: string;
  weight?: string;
  unit?: string;
  qty: number;
  rate: number;
  discountType?: DiscountType;
  discountValue?: number;
  gstRate?: number; // Optional per-line GST rate; falls back to invoice-level rate
  manualAmount?: number | null; // Optional Mewari weight-based manual amount override
}

export interface CalculatedLineItem extends InvoiceLineItemInput {
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  appliedGstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface GstConfig {
  taxType: GstTaxType;
  gstRate: number;
  placeOfSupply: string;
  placeOfSupplyCode?: string;
  reverseCharge: boolean;
  primarySac: string;
  documentBadge: string;
  serviceSummaryNote: string;
  enableRoundOff: boolean;
  invoiceDiscountType: DiscountType;
  invoiceDiscountValue: number;
}

export interface DigitalSealConfig {
  enabled: boolean;
  statusText: string;
  style: 'teal' | 'green' | 'blue' | 'charcoal' | 'red';
  verificationId: string;
  timestampText: string;
}

export interface InvoiceCustomerSnapshot {
  customerId?: string;
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  pan?: string;
  state?: string;
  stateCode?: string;
}

export interface BillingInvoice {
  id: string;
  docType: 'invoice';
  businessId: BusinessId;
  documentType: BillingDocumentType;
  templateId: InvoiceTemplateId;
  invoiceNumber: string;
  financialYear: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  currencySymbol: string;
  customer: InvoiceCustomerSnapshot;
  businessSnapshot: BusinessProfile;
  gstConfig: GstConfig;
  items: CalculatedLineItem[];
  subtotal: number;
  itemDiscountTotal: number;
  invoiceDiscountAmount: number;
  discountTotal: number;
  taxableValue: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  amountInWords: string;
  paymentMethod: PaymentMethod;
  paymentInfo: string;
  terms: string[];
  notes: string;
  digitalSeal?: DigitalSealConfig;
  cancellationReason?: string;
  cancelledAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingPayment {
  id: string;
  docType: 'payment';
  businessId: BusinessId;
  invoiceId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  referenceNo: string;
  paymentDate: string;
  notes: string;
  recordedBy: string;
  createdAt: string;
}

export interface BillingAuditEntry {
  id: string;
  docType: 'audit';
  businessId: BusinessId;
  action:
    | 'INVOICE_CREATED'
    | 'INVOICE_UPDATED'
    | 'INVOICE_STATUS_CHANGED'
    | 'INVOICE_CANCELLED'
    | 'INVOICE_DELETED'
    | 'PAYMENT_RECORDED'
    | 'PAYMENT_DELETED'
    | 'CUSTOMER_SAVED'
    | 'CUSTOMER_DELETED'
    | 'PRODUCT_SAVED'
    | 'PRODUCT_DELETED'
    | 'BUSINESS_UPDATED'
    | 'TERMS_SAVED';
  entityType: 'invoice' | 'payment' | 'customer' | 'product' | 'business' | 'terms';
  entityId: string;
  summary: string;
  reason?: string;
  actorEmail: string;
  createdAt: string;
}

export interface AdminUserSession {
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'BILLING_ADMIN';
  authenticatedAt: string;
  expiresAt: string;
}

export type DashboardTab =
  | 'dashboard'
  | 'new_invoice'
  | 'invoices'
  | 'quotations'
  | 'customers'
  | 'products'
  | 'payments'
  | 'reports'
  | 'terms'
  | 'business_settings';

