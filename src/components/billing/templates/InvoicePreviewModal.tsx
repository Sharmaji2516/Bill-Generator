'use client';

import React, { useRef, useState } from 'react';
import { BillingInvoice } from '@/types';
import { GstTaxInvoiceTemplate } from './GstTaxInvoiceTemplate';
import { ServiceClassicInvoiceTemplate } from './ServiceClassicInvoiceTemplate';
import { ModernInvoiceTemplate } from './ModernInvoiceTemplate';
import { MewariInvoiceTemplate } from './MewariInvoiceTemplate';
import { exportInvoiceElementToPdf } from '@/lib/billing/exportService';
import { Download, Printer, X, Loader2 } from 'lucide-react';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';

interface InvoicePreviewModalProps {
  invoice: BillingInvoice | null;
  onClose: () => void;
}

export const InvoiceSheetRenderer: React.FC<{ invoice: BillingInvoice }> = ({ invoice }) => {
  switch (invoice.templateId) {
    case 'service_classic':
      return <ServiceClassicInvoiceTemplate invoice={invoice} />;
    case 'modern':
      return <ModernInvoiceTemplate invoice={invoice} />;
    case 'mewari':
      return <MewariInvoiceTemplate invoice={invoice} />;
    case 'gst_tax':
    default:
      return <GstTaxInvoiceTemplate invoice={invoice} />;
  }
};

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ invoice, onClose }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useConfirmationModal();
  const [downloading, setDownloading] = useState(false);

  if (!invoice) return null;

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      await exportInvoiceElementToPdf(
        sheetRef.current,
        `${invoice.invoiceNumber}_${invoice.customer.name || 'Invoice'}`
      );
      showSuccess({
        title: 'PDF Downloaded',
        message: `${invoice.invoiceNumber} exported as A4 PDF cleanly.`,
        duration: 2200,
      });
    } catch (err) {
      showError({
        title: 'PDF Export Failed',
        message: err instanceof Error ? err.message : 'Could not render invoice PDF.',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/65 backdrop-blur-xs overflow-y-auto print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto print:border-0 print:shadow-none print:max-h-none print:max-w-none print:rounded-none">
        {/* Action Header (Hidden when printing) */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              A4 Preview • {invoice.invoiceNumber}
            </h3>
            <p className="text-[11px] text-slate-500">
              {invoice.businessSnapshot.tradeName} • {invoice.documentType.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print A4
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download A4 PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controlled horizontal scroll container for exact 794px A4 sheet on tablet viewports */}
        <div className="flex-1 overflow-auto bg-slate-200/75 p-4 sm:p-6 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div ref={sheetRef} className="invoice-sheet-print-target shadow-xl print:shadow-none shrink-0">
            <InvoiceSheetRenderer invoice={invoice} />
          </div>
        </div>
      </div>
    </div>
  );
};

