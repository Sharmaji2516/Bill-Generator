import { BillingDocumentType, BusinessId, InvoiceLineItemInput, InvoiceTemplateId } from '@/types';

export interface ImportedLegacyDraft {
  sourceKey: 'chittortech_bill_draft' | 'chittortech_gst_bill_draft' | 'mewari_bill_draft';
  label: string;
  businessId: BusinessId;
  templateId: InvoiceTemplateId;
  documentType: BillingDocumentType;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerGstin: string;
  items: InvoiceLineItemInput[];
  notes: string;
  paymentInfo: string;
}

export function detectLegacyLocalStorageDrafts(): ImportedLegacyDraft[] {
  if (typeof window === 'undefined') return [];

  const drafts: ImportedLegacyDraft[] = [];

  try {
    const svcRaw = localStorage.getItem('chittortech_bill_draft');
    if (svcRaw) {
      const parsed = JSON.parse(svcRaw);
      const items: InvoiceLineItemInput[] = Array.isArray(parsed.items)
        ? parsed.items.map((it: any, idx: number) => ({
            id: `legacy-svc-${idx}-${Date.now()}`,
            description: String(it.desc || it.description || 'Service Item'),
            qty: Number(it.qty) || 1,
            rate: Number(it.rate) || 0,
            unit: 'Units',
          }))
        : [];
      if (parsed.invNum || parsed.custName || items.length > 0) {
        drafts.push({
          sourceKey: 'chittortech_bill_draft',
          label: `Legacy Service Draft (${parsed.invNum || 'Unsaved'})`,
          businessId: 'chittortech',
          templateId: 'service_classic',
          documentType: 'SERVICE_INVOICE',
          invoiceNumber: parsed.invNum || '',
          issueDate: parsed.invDate || new Date().toISOString().split('T')[0],
          dueDate: parsed.dueDate || '',
          customerName: parsed.custName || '',
          customerEmail: parsed.custEmail || '',
          customerPhone: parsed.custPhone || '',
          customerAddress: parsed.custAddr || '',
          customerGstin: '',
          items,
          notes: parsed.notes || '',
          paymentInfo: parsed.payInfo || '',
        });
      }
    }
  } catch {
    // Ignore malformed legacy localStorage data
  }

  try {
    const gstRaw = localStorage.getItem('chittortech_gst_bill_draft');
    if (gstRaw) {
      const parsed = JSON.parse(gstRaw);
      const items: InvoiceLineItemInput[] = Array.isArray(parsed.items)
        ? parsed.items.map((it: any, idx: number) => ({
            id: `legacy-gst-${idx}-${Date.now()}`,
            description: String(it.desc || it.description || 'Service Item'),
            hsnSac: parsed.sacCode || '998314',
            qty: Number(it.qty) || 1,
            rate: Number(it.rate) || 0,
            unit: 'Units',
          }))
        : [];
      if (parsed.invNum || parsed.custName || items.length > 0) {
        drafts.push({
          sourceKey: 'chittortech_gst_bill_draft',
          label: `Legacy GST Tax Draft (${parsed.invNum || 'Unsaved'})`,
          businessId: 'chittortech',
          templateId: 'gst_tax',
          documentType: 'TAX_INVOICE',
          invoiceNumber: parsed.invNum || '',
          issueDate: parsed.invDate || new Date().toISOString().split('T')[0],
          dueDate: parsed.dueDate || '',
          customerName: parsed.custName || '',
          customerEmail: parsed.custEmail || '',
          customerPhone: parsed.custPhone || '',
          customerAddress: parsed.custAddr || '',
          customerGstin: parsed.custGstin || '',
          items,
          notes: parsed.notes || '',
          paymentInfo: parsed.payInfo || '',
        });
      }
    }
  } catch {
    // Ignore malformed legacy localStorage data
  }

  try {
    const mewariRaw = localStorage.getItem('mewari_bill_draft');
    if (mewariRaw) {
      const parsed = JSON.parse(mewariRaw);
      const items: InvoiceLineItemInput[] = Array.isArray(parsed.items)
        ? parsed.items.map((it: any, idx: number) => ({
            id: `legacy-mewari-${idx}-${Date.now()}`,
            description: String(it.desc || it.description || 'Mewari Achaar Item'),
            weight: String(it.weight || ''),
            qty: Number(it.qty) || 1,
            rate: Number(it.rate) || 0,
            manualAmount: it.manualAmount !== '' && it.manualAmount != null ? Number(it.manualAmount) : null,
            unit: 'Kg',
          }))
        : [];
      if (parsed.invNum || parsed.custName || items.length > 0) {
        drafts.push({
          sourceKey: 'mewari_bill_draft',
          label: `Legacy Mewari Draft (${parsed.invNum || 'Unsaved'})`,
          businessId: 'mewari_achaar',
          templateId: 'mewari',
          documentType: 'SERVICE_INVOICE',
          invoiceNumber: parsed.invNum || '',
          issueDate: parsed.invDate || new Date().toISOString().split('T')[0],
          dueDate: parsed.dueDate || '',
          customerName: parsed.custName || '',
          customerEmail: parsed.custEmail || '',
          customerPhone: parsed.custPhone || '',
          customerAddress: parsed.custAddr || '',
          customerGstin: '',
          items,
          notes: parsed.notes || '',
          paymentInfo: parsed.payInfo || '',
        });
      }
    }
  } catch {
    // Ignore malformed legacy localStorage data
  }

  return drafts;
}

export function detectLegacyTermsContent(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('chittortech_terms_content');
  } catch {
    return null;
  }
}

