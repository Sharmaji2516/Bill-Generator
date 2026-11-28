'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FilePlus2,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  Loader2,
  Sparkles,
  UserPlus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';
import { calculateInvoiceTotals, formatINR, getIndianFinancialYear } from '@/lib/billing/gstEngine';
import { getDocumentPrefix, INDIAN_STATES } from '@/lib/billing/businesses';
import { detectLegacyLocalStorageDrafts, ImportedLegacyDraft } from '@/lib/billing/legacyDraftImporter';
import { InvoicePreviewModal } from './templates/InvoicePreviewModal';
import {
  BillingDocumentType,
  BillingInvoice,
  DigitalSealConfig,
  DiscountType,
  GstTaxType,
  InvoiceLineItemInput,
  InvoiceStatus,
  InvoiceTemplateId,
  PaymentMethod,
} from '@/types';

interface InvoiceBuilderProps {
  initialInvoice?: BillingInvoice | null;
  duplicateSource?: BillingInvoice | null;
  defaultDocumentType?: BillingDocumentType;
  onSavedSuccess: () => void;
}

const DOC_TYPES: { value: BillingDocumentType; label: string }[] = [
  { value: 'TAX_INVOICE', label: 'GST Tax Invoice' },
  { value: 'SERVICE_INVOICE', label: 'Service Invoice' },
  { value: 'QUOTATION', label: 'Quotation / Estimate' },
  { value: 'PROFORMA_INVOICE', label: 'Proforma Invoice' },
  { value: 'PAYMENT_RECEIPT', label: 'Payment Receipt' },
  { value: 'CREDIT_NOTE', label: 'Credit Note' },
  { value: 'DEBIT_NOTE', label: 'Debit Note' },
];

const TEMPLATES: { value: InvoiceTemplateId; label: string }[] = [
  { value: 'gst_tax', label: 'GST Tax Invoice' },
  { value: 'service_classic', label: 'Classic Service Sheet' },
  { value: 'modern', label: 'Modern Clean Sheet' },
  { value: 'mewari', label: 'Mewari Weight Sheet' },
];

export const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({
  initialInvoice,
  duplicateSource,
  defaultDocumentType = 'TAX_INVOICE',
  onSavedSuccess,
}) => {
  const { activeBusiness, customers, products, refreshAllData } = useBusiness();
  const { showSuccess, showError } = useConfirmationModal();

  const source = initialInvoice || duplicateSource || null;
  const isEditing = Boolean(initialInvoice);

  const [documentType, setDocumentType] = useState<BillingDocumentType>(
    source?.documentType || defaultDocumentType
  );
  const [templateId, setTemplateId] = useState<InvoiceTemplateId>(
    source?.templateId || activeBusiness.defaultTemplate || 'gst_tax'
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialInvoice ? initialInvoice.invoiceNumber : ''
  );
  const [suggestedNumber, setSuggestedNumber] = useState('');
  const [issueDate, setIssueDate] = useState(
    () => source?.issueDate || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    () =>
      source?.dueDate ||
      new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<InvoiceStatus>(
    initialInvoice ? initialInvoice.status : 'UNPAID'
  );

  // Customer Snapshot
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    source?.customer.customerId || ''
  );
  const [custName, setCustName] = useState(source?.customer.name || '');
  const [custCompany, setCustCompany] = useState(source?.customer.companyName || '');
  const [custPhone, setCustPhone] = useState(source?.customer.phone || '');
  const [custEmail, setCustEmail] = useState(source?.customer.email || '');
  const [custGstin, setCustGstin] = useState(source?.customer.gstin || '');
  const [custAddr, setCustAddr] = useState(source?.customer.address || '');
  const [custState, setCustState] = useState(
    source?.customer.state || source?.gstConfig.placeOfSupply || activeBusiness.state
  );

  // GST Config
  const [taxType, setTaxType] = useState<GstTaxType>(
    source?.gstConfig.taxType || (activeBusiness.gstRegistered ? 'CGST_SGST' : 'EXEMPT')
  );
  const [gstRate, setGstRate] = useState<number>(
    source?.gstConfig.gstRate ?? activeBusiness.defaultGstRate
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(
    source?.gstConfig.placeOfSupply || activeBusiness.state
  );
  const [primarySac, setPrimarySac] = useState(source?.gstConfig.primarySac || '998314');
  const [reverseCharge, setReverseCharge] = useState(
    Boolean(source?.gstConfig.reverseCharge)
  );
  const [enableRoundOff, setEnableRoundOff] = useState(
    source?.gstConfig.enableRoundOff ?? true
  );
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<DiscountType>(
    source?.gstConfig.invoiceDiscountType || 'NONE'
  );
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState<number>(
    source?.gstConfig.invoiceDiscountValue || 0
  );

  // Items
  const [items, setItems] = useState<InvoiceLineItemInput[]>(() =>
    source?.items?.length
      ? source.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          description: it.description,
          hsnSac: it.hsnSac,
          weight: it.weight,
          unit: it.unit,
          qty: it.qty,
          rate: it.rate,
          discountType: it.discountType || 'NONE',
          discountValue: it.discountValue || 0,
          gstRate: it.gstRate,
          manualAmount: it.manualAmount ?? null,
        }))
      : [
          {
            id: `row-${Date.now()}`,
            description:
              activeBusiness.id === 'chittortech'
                ? 'Software Development & Digital Infrastructure Services'
                : 'Service / Goods Particulars',
            hsnSac: '998314',
            weight: '',
            unit: 'Units',
            qty: 1,
            rate: 0,
            manualAmount: null,
          },
        ]
  );

  // Payment, Seal & Terms
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    source?.paymentMethod || 'Bank Transfer'
  );
  const [paymentInfo, setPaymentInfo] = useState(
    source?.paymentInfo || activeBusiness.paymentInstructions || ''
  );
  const [notes, setNotes] = useState(source?.notes || '');
  const [termsText, setTermsText] = useState(
    (source?.terms || activeBusiness.defaultTerms || []).join('\n')
  );
  const [editReason, setEditReason] = useState('');

  const [digitalSeal, setDigitalSeal] = useState<DigitalSealConfig>(
    source?.digitalSeal || {
      enabled: true,
      statusText: 'DIGITALLY VERIFIED',
      style: 'teal',
      verificationId: `CT-${new Date().getFullYear()}-VER`,
      timestampText: new Date().toLocaleDateString('en-IN'),
    }
  );

  // UI & Modals
  const [legacyDrafts, setLegacyDrafts] = useState<ImportedLegacyDraft[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showLiveSheetModal, setShowLiveSheetModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Detect any legacy localStorage drafts on mount
  useEffect(() => {
    setLegacyDrafts(detectLegacyLocalStorageDrafts());
  }, []);

  // Refresh defaults when switching active Business on a brand new invoice
  useEffect(() => {
    if (!source) {
      setTemplateId(activeBusiness.defaultTemplate || 'gst_tax');
      setGstRate(activeBusiness.defaultGstRate);
      setTaxType(activeBusiness.gstRegistered ? 'CGST_SGST' : 'EXEMPT');
      setPlaceOfSupply(activeBusiness.state);
      setCustState(activeBusiness.state);
      setPaymentInfo(activeBusiness.paymentInstructions || '');
      setTermsText((activeBusiness.defaultTerms || []).join('\n'));
    }
  }, [activeBusiness, source]);

  // Fetch suggested sequential number from server
  useEffect(() => {
    if (isEditing) return;
    const fetchNext = async () => {
      try {
        const res = await fetch(
          `/api/billing/invoices?businessId=${encodeURIComponent(activeBusiness.id)}&previewDocType=${encodeURIComponent(documentType)}&issueDate=${encodeURIComponent(issueDate)}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.nextNumber) {
            setSuggestedNumber(data.nextNumber);
          }
        }
      } catch {
        const prefix = getDocumentPrefix(activeBusiness, documentType);
        setSuggestedNumber(`${prefix}-001`);
      }
    };
    fetchNext();
  }, [activeBusiness, documentType, issueDate, isEditing]);

  // Auto-detect CGST+SGST vs IGST when Place of Supply changes
  const handlePlaceOfSupplyChange = (nextState: string) => {
    setPlaceOfSupply(nextState);
    setCustState(nextState);
    if (!activeBusiness.gstRegistered) return;
    if (nextState.trim().toLowerCase() === activeBusiness.state.trim().toLowerCase()) {
      setTaxType('CGST_SGST');
    } else {
      setTaxType('IGST');
    }
  };

  const handleCustomerPick = (id: string) => {
    setSelectedCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    setCustName(c.name);
    setCustCompany(c.companyName || '');
    setCustPhone(c.phone || '');
    setCustEmail(c.email || '');
    setCustGstin(c.gstin || '');
    setCustAddr(c.address || '');
    if (c.state) {
      handlePlaceOfSupplyChange(c.state);
    }
  };

  const handleProductPickForRow = (rowId: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setItems((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              productId: prod.id,
              description: prod.description ? `${prod.name} — ${prod.description}` : prod.name,
              hsnSac: prod.hsnSac || row.hsnSac,
              unit: prod.unit || row.unit,
              weight: prod.defaultWeight || row.weight,
              rate: prod.price,
            }
          : row
      )
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${prev.length}`,
        description: '',
        hsnSac: primarySac,
        weight: '',
        unit: templateId === 'mewari' ? 'Kg' : 'Units',
        qty: 1,
        rate: 0,
        manualAmount: null,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  const updateItem = (id: string, patch: Partial<InvoiceLineItemInput>) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const calc = useMemo(
    () =>
      calculateInvoiceTotals(items, {
        taxType,
        gstRate: Number(gstRate) || 0,
        placeOfSupply,
        reverseCharge,
        primarySac,
        documentBadge: 'ORIGINAL FOR RECIPIENT',
        serviceSummaryNote: '',
        enableRoundOff,
        invoiceDiscountType,
        invoiceDiscountValue: Number(invoiceDiscountValue) || 0,
      }),
    [
      items,
      taxType,
      gstRate,
      placeOfSupply,
      reverseCharge,
      primarySac,
      enableRoundOff,
      invoiceDiscountType,
      invoiceDiscountValue,
    ]
  );

  // Build live preview invoice object for A4 modal
  const previewInvoiceObject: BillingInvoice = useMemo(() => {
    const posCode =
      INDIAN_STATES.find((s) => s.name.toLowerCase() === placeOfSupply.toLowerCase())?.code || '';
    return {
      id: initialInvoice?.id || 'preview',
      docType: 'invoice',
      businessId: activeBusiness.id,
      documentType,
      templateId,
      invoiceNumber: invoiceNumber.trim() || suggestedNumber || 'DRAFT-PREVIEW',
      financialYear: getIndianFinancialYear(issueDate),
      issueDate,
      dueDate,
      status,
      currencySymbol: activeBusiness.defaultCurrency || '₹',
      customer: {
        customerId: selectedCustomerId || undefined,
        name: custName || 'Client Name',
        companyName: custCompany,
        email: custEmail,
        phone: custPhone,
        address: custAddr,
        gstin: custGstin,
        state: custState,
      },
      businessSnapshot: activeBusiness,
      gstConfig: {
        taxType,
        gstRate,
        placeOfSupply,
        placeOfSupplyCode: posCode,
        reverseCharge,
        primarySac,
        documentBadge: 'ORIGINAL FOR RECIPIENT',
        serviceSummaryNote: '',
        enableRoundOff,
        invoiceDiscountType,
        invoiceDiscountValue,
      },
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
      amountPaid: status === 'PAID' ? calc.grandTotal : 0,
      balanceDue: status === 'PAID' ? 0 : calc.grandTotal,
      amountInWords: calc.amountInWords,
      paymentMethod,
      paymentInfo,
      terms: termsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      notes,
      digitalSeal,
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [
    initialInvoice?.id,
    activeBusiness,
    documentType,
    templateId,
    invoiceNumber,
    suggestedNumber,
    issueDate,
    dueDate,
    status,
    selectedCustomerId,
    custName,
    custCompany,
    custEmail,
    custPhone,
    custAddr,
    custGstin,
    custState,
    taxType,
    gstRate,
    placeOfSupply,
    reverseCharge,
    primarySac,
    enableRoundOff,
    invoiceDiscountType,
    invoiceDiscountValue,
    calc,
    paymentMethod,
    paymentInfo,
    termsText,
    notes,
    digitalSeal,
  ]);

  const handleImportLegacyDraft = (draft: ImportedLegacyDraft) => {
    setDocumentType(draft.documentType);
    setTemplateId(draft.templateId);
    if (draft.invoiceNumber) setInvoiceNumber(draft.invoiceNumber);
    if (draft.issueDate) setIssueDate(draft.issueDate);
    if (draft.dueDate) setDueDate(draft.dueDate);
    setCustName(draft.customerName);
    setCustEmail(draft.customerEmail);
    setCustPhone(draft.customerPhone);
    setCustAddr(draft.customerAddress);
    setCustGstin(draft.customerGstin);
    if (draft.items.length > 0) setItems(draft.items);
    if (draft.notes) setNotes(draft.notes);
    if (draft.paymentInfo) setPaymentInfo(draft.paymentInfo);
    showSuccess({
      title: 'Legacy Draft Imported',
      message: `${draft.label} loaded into the builder. Review and save to billing_details.`,
      duration: 2300,
    });
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      showError({ title: 'Missing Client Name', message: 'Please enter the recipient/customer name.' });
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      showError({ title: 'Incomplete Line Item', message: 'Every line item must have a description.' });
      return;
    }
    setShowReviewModal(true);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const posCode =
        INDIAN_STATES.find((s) => s.name.toLowerCase() === placeOfSupply.toLowerCase())?.code || '';
      const payload = {
        id: initialInvoice?.id || undefined,
        businessId: activeBusiness.id,
        documentType,
        templateId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        financialYear: getIndianFinancialYear(issueDate),
        issueDate,
        dueDate,
        status,
        currencySymbol: activeBusiness.defaultCurrency || '₹',
        customer: {
          customerId: selectedCustomerId || undefined,
          name: custName.trim(),
          companyName: custCompany.trim(),
          email: custEmail.trim(),
          phone: custPhone.trim(),
          address: custAddr.trim(),
          gstin: custGstin.trim().toUpperCase(),
          state: custState,
          stateCode: posCode,
        },
        gstConfig: {
          taxType,
          gstRate: Number(gstRate) || 0,
          placeOfSupply,
          placeOfSupplyCode: posCode,
          reverseCharge,
          primarySac,
          documentBadge: 'ORIGINAL FOR RECIPIENT',
          serviceSummaryNote: '',
          enableRoundOff,
          invoiceDiscountType,
          invoiceDiscountValue: Number(invoiceDiscountValue) || 0,
        },
        items,
        paymentMethod,
        paymentInfo,
        terms: termsText
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean),
        notes,
        digitalSeal,
        editReason: isEditing ? editReason.trim() || 'Invoice updated' : undefined,
      };

      const res = await fetch('/api/billing/invoices', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setShowReviewModal(false);
        showError({
          title: res.status === 412 ? 'Manual Firestore Setup Needed' : 'Save Failed',
          message: data.error || 'Could not save invoice.',
        });
        return;
      }

      setShowReviewModal(false);
      await refreshAllData(activeBusiness.id);
      showSuccess({
        title: isEditing ? 'Document Updated' : 'Document Issued & Saved',
        message: `${data.invoice.invoiceNumber} for ${data.invoice.customer.name} saved to billing_details.`,
        referenceText: `Grand Total: ${formatINR(data.invoice.grandTotal, data.invoice.currencySymbol)}`,
        duration: 2800,
        onCloseCallback: onSavedSuccess,
      });
    } catch {
      setShowReviewModal(false);
      showError({ title: 'Network Error', message: 'Failed to save billing document.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleOpenReview} className="space-y-5 animate-fadeIn">
      {/* Legacy Draft Detection Banner */}
      {!source && legacyDrafts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Legacy local drafts detected from previous HTML billing version. Import into this editor?
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {legacyDrafts.map((d) => (
              <button
                key={d.sourceKey}
                type="button"
                onClick={() => handleImportLegacyDraft(d)}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 font-bold text-amber-800 hover:bg-amber-100"
              >
                Import {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top Mode & Template Bar (Exact LMS NewEntryForm top control bar) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-[#2563EB]" />
            {isEditing
              ? `Edit ${initialInvoice?.invoiceNumber}`
              : `New Document • ${activeBusiness.tradeName}`}
          </h2>
          <p className="text-xs text-slate-500">
            Entity-isolated sequential numbering • GST &amp; Indian Rupee words calculated automatically
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLiveSheetModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Eye className="w-3.5 h-3.5 text-[#2563EB]" /> Live A4 Preview
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Review &amp; Save
          </button>
        </div>
      </div>

      {/* Document Metadata & Template Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Document Type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as BillingDocumentType)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-semibold"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">A4 Print Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value as InvoiceTemplateId)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-semibold"
            >
              {TEMPLATES.map((tpl) => (
                <option key={tpl.value} value={tpl.value}>
                  {tpl.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Document Number <span className="font-normal text-slate-400">(Auto if blank)</span>
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder={suggestedNumber || 'Auto-generated'}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold text-blue-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-semibold"
            >
              <option value="DRAFT">Draft</option>
              <option value="UNPAID">Unpaid / Issued</option>
              <option value="PARTIAL">Partially Paid</option>
              <option value="PAID">Paid in Full</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Issue Date</label>
            <input
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">GST Tax Regime</label>
            <select
              value={taxType}
              onChange={(e) => setTaxType(e.target.value as GstTaxType)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-semibold"
            >
              <option value="CGST_SGST">Intra-State (CGST + SGST)</option>
              <option value="IGST">Inter-State (IGST)</option>
              <option value="EXEMPT">Exempt / Non-GST</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">GST Rate %</label>
              <select
                value={gstRate}
                disabled={taxType === 'EXEMPT'}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-2.5 py-2 bg-white font-mono"
              >
                {[0, 5, 12, 18, 28].map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary SAC</label>
              <input
                type="text"
                value={primarySac}
                onChange={(e) => setPrimarySac(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-2.5 py-2 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Client Details Block */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#2563EB]" />
              Recipient / Billed To
            </h3>
            {customers.length > 0 && (
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerPick(e.target.value)}
                className="rounded-xl border border-blue-200 bg-[#EAF3FF] px-3 py-1.5 text-xs font-bold text-[#2563EB] max-w-xs"
              >
                <option value="">-- Quick Fill Saved Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Customer Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="Client full name or firm"
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company / Firm</label>
              <input
                type="text"
                value={custCompany}
                onChange={(e) => setCustCompany(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Customer GSTIN</label>
              <input
                type="text"
                value={custGstin}
                onChange={(e) => setCustGstin(e.target.value.toUpperCase())}
                placeholder="Optional (leave blank for B2C)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={custEmail}
                onChange={(e) => setCustEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Place of Supply State</label>
              <select
                value={placeOfSupply}
                onChange={(e) => handlePlaceOfSupplyChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block font-bold text-slate-700 mb-1">Billing Address</label>
              <input
                type="text"
                value={custAddr}
                onChange={(e) => setCustAddr(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Line Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAF3FF] text-[#2563EB] border border-[#BFDBFE] font-bold hover:bg-blue-100"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-xl">
            <table className="w-full min-w-[920px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Description / Catalog Pick</th>
                  <th className="py-2.5 px-2.5 w-24">HSN/SAC</th>
                  {templateId === 'mewari' && <th className="py-2.5 px-2.5 w-24">Weight</th>}
                  <th className="py-2.5 px-2.5 w-20 text-right">Qty</th>
                  <th className="py-2.5 px-2.5 w-28 text-right">Rate</th>
                  {templateId === 'mewari' && (
                    <th className="py-2.5 px-2.5 w-28 text-right">Manual Amt</th>
                  )}
                  <th className="py-2.5 px-2.5 w-28 text-right">Taxable</th>
                  <th className="py-2.5 px-3 w-12 text-center">Del</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const calcRow = calc.items[idx];
                  return (
                    <tr key={item.id} className="border-t border-slate-200 odd:bg-white even:bg-slate-50/70">
                      <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2 space-y-1">
                        {products.length > 0 && (
                          <select
                            value={item.productId || ''}
                            onChange={(e) => handleProductPickForRow(item.id, e.target.value)}
                            className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-2 py-1 text-[11px] font-semibold text-blue-800"
                          >
                            <option value="">Pick saved service/product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatINR(p.price)})
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          placeholder="Service or goods description"
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.hsnSac || ''}
                          onChange={(e) => updateItem(item.id, { hsnSac: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono"
                        />
                      </td>
                      {templateId === 'mewari' && (
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.weight || ''}
                            onChange={(e) => updateItem(item.id, { weight: e.target.value })}
                            placeholder="e.g. 2.5 kg"
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                          />
                        </td>
                      )}
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.qty}
                          onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-right font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, { rate: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-right font-mono"
                        />
                      </td>
                      {templateId === 'mewari' && (
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.manualAmount ?? ''}
                            placeholder="Auto"
                            onChange={(e) =>
                              updateItem(item.id, {
                                manualAmount: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-2 py-1.5 text-right font-mono"
                          />
                        </td>
                      )}
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        {formatINR(calcRow?.taxableAmount || 0, activeBusiness.defaultCurrency)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals, Discounts, Seal, Payment & Terms */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Discount</label>
                <select
                  value={invoiceDiscountType}
                  onChange={(e) => setInvoiceDiscountType(e.target.value as DiscountType)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="NONE">No Discount</option>
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FIXED">Flat Amount</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Discount Value</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={invoiceDiscountType === 'NONE'}
                  value={invoiceDiscountValue}
                  onChange={(e) => setInvoiceDiscountValue(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI / PhonePe / GPay">UPI / PhonePe / GPay</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableRoundOff}
                  onChange={(e) => setEnableRoundOff(e.target.checked)}
                />
                Auto Round-Off to Nearest Rupee
              </label>
              <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reverseCharge}
                  onChange={(e) => setReverseCharge(e.target.checked)}
                />
                GST Reverse Charge (RCM)
              </label>
              <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={digitalSeal.enabled}
                  onChange={(e) =>
                    setDigitalSeal((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                />
                Include Digital Verification Seal
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Instructions</label>
                <textarea
                  rows={3}
                  value={paymentInfo}
                  onChange={(e) => setPaymentInfo(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 resize-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Terms (one per line)</label>
                <textarea
                  rows={3}
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 resize-none"
                />
              </div>
            </div>

            {isEditing && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Edit (Audit Log)
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Describe why this saved invoice was modified..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
            )}
          </div>

          {/* Live Calculation Summary Box */}
          <div className="lg:col-span-5 rounded-2xl border border-[#D6E8FF] bg-[#F5F9FF] p-5 space-y-2.5 self-start">
            <div className="flex items-center justify-between border-b border-blue-200/70 pb-2">
              <span className="font-bold text-sm text-[#0F2942]">Live Calculation Summary</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-blue-200 text-[#2563EB]">
                {taxType}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-mono font-bold">
                {formatINR(calc.subtotal, activeBusiness.defaultCurrency)}
              </span>
            </div>
            {calc.discountTotal > 0 && (
              <div className="flex justify-between text-xs text-teal-700">
                <span>Discount</span>
                <span className="font-mono font-bold">
                  -{formatINR(calc.discountTotal, activeBusiness.defaultCurrency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Taxable Value</span>
              <span className="font-mono font-bold">
                {formatINR(calc.taxableValue, activeBusiness.defaultCurrency)}
              </span>
            </div>
            {taxType === 'CGST_SGST' && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">CGST ({gstRate / 2}%)</span>
                  <span className="font-mono">{formatINR(calc.cgstTotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">SGST ({gstRate / 2}%)</span>
                  <span className="font-mono">{formatINR(calc.sgstTotal)}</span>
                </div>
              </>
            )}
            {taxType === 'IGST' && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">IGST ({gstRate}%)</span>
                <span className="font-mono">{formatINR(calc.igstTotal)}</span>
              </div>
            )}
            {calc.roundOff !== 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Round Off</span>
                <span className="font-mono">
                  {calc.roundOff > 0 ? '+' : ''}
                  {calc.roundOff.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2.5 border-t border-blue-200 text-base font-extrabold text-[#0F2942]">
              <span>Grand Total</span>
              <span className="font-mono">
                {formatINR(calc.grandTotal, activeBusiness.defaultCurrency)}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-600 leading-snug pt-1">
              {calc.amountInWords}
            </p>
          </div>
        </div>

        {/* Form Bottom Actions (Exact LMS NewEntryForm responsive flex) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowLiveSheetModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eye className="w-3.5 h-3.5" /> Inspect A4 Layout &amp; PDF
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <ShieldCheck className="w-4 h-4" />
            {isEditing ? 'Review & Update Document' : 'Review & Finalize Document'}
          </button>
        </div>
      </div>

      {/* Live A4 Sheet Modal */}
      {showLiveSheetModal && (
        <InvoicePreviewModal
          invoice={previewInvoiceObject}
          onClose={() => setShowLiveSheetModal(false)}
        />
      )}

      {/* LMS-style Review & Confirm Data Modal before writing to billing_details */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Review &amp; Confirm Billing Document
                </h3>
                <p className="text-[11px] text-slate-500">
                  Verify values before saving to chittor-tech / billing_details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Issuing Business</span>
                  <span className="font-bold text-slate-900">{activeBusiness.tradeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Document Number</span>
                  <span className="font-mono font-bold text-blue-700">
                    {invoiceNumber.trim() || suggestedNumber || 'Auto'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient</span>
                  <span className="font-bold text-slate-900">{custName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax Regime</span>
                  <span className="font-semibold">{taxType} ({gstRate}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Line Items</span>
                  <span className="font-mono">{items.length} item(s)</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-emerald-800">
                  <span>Grand Total</span>
                  <span className="font-mono">
                    {formatINR(calc.grandTotal, activeBusiness.defaultCurrency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowReviewModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Edit Data
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving to Firestore...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm &amp; Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
