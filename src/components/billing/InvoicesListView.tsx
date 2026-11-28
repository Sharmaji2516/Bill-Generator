'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Eye,
  Edit3,
  Copy,
  Trash2,
  CheckCircle2,
  Ban,
  Plus,
} from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { InvoicePreviewModal } from './templates/InvoicePreviewModal';
import { formatDateDDMMYYYY, formatINR } from '@/lib/billing/gstEngine';
import { BillingDocumentType, BillingInvoice, InvoiceStatus } from '@/types';

interface InvoicesListViewProps {
  mode: 'invoices' | 'quotations';
  onEditInvoice: (invoice: BillingInvoice) => void;
  onDuplicateInvoice: (invoice: BillingInvoice) => void;
  onCreateNew: (defaultDocType: BillingDocumentType) => void;
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PARTIAL: 'bg-blue-100 text-blue-800 border-blue-200',
  UNPAID: 'bg-amber-100 text-amber-800 border-amber-200',
  OVERDUE: 'bg-rose-100 text-rose-800 border-rose-200',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  CANCELLED: 'bg-slate-200 text-slate-500 border-slate-300 line-through',
};

export const InvoicesListView: React.FC<InvoicesListViewProps> = ({
  mode,
  onEditInvoice,
  onDuplicateInvoice,
  onCreateNew,
}) => {
  const { activeBusiness, invoices, businessMap, refreshAllData } = useBusiness();
  const { showSuccess, showError } = useConfirmationModal();

  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [previewInvoice, setPreviewInvoice] = useState<BillingInvoice | null>(null);

  const [statusAction, setStatusAction] = useState<{
    invoice: BillingInvoice;
    targetStatus: InvoiceStatus;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BillingInvoice | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const allowedDocTypes: BillingDocumentType[] =
      mode === 'quotations'
        ? ['QUOTATION', 'PROFORMA_INVOICE']
        : ['TAX_INVOICE', 'SERVICE_INVOICE', 'PAYMENT_RECEIPT', 'CREDIT_NOTE', 'DEBIT_NOTE'];

    const q = search.trim().toLowerCase();

    return invoices.filter((inv) => {
      if (!allowedDocTypes.includes(inv.documentType)) return false;
      if (scope === 'active' && inv.businessId !== activeBusiness.id) return false;
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customer.name.toLowerCase().includes(q) ||
        (inv.customer.companyName || '').toLowerCase().includes(q) ||
        (inv.customer.gstin || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, mode, scope, activeBusiness.id, statusFilter, search]);

  const handleStatusConfirm = async (reason: string) => {
    if (!statusAction) return;
    setBusy(true);
    try {
      const res = await fetch('/api/billing/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: statusAction.invoice.id,
          businessId: statusAction.invoice.businessId,
          status: statusAction.targetStatus,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError({ title: 'Status Update Failed', message: data.error || 'Could not update.' });
        return;
      }
      setStatusAction(null);
      await refreshAllData(activeBusiness.id);
      showSuccess({
        title: 'Status Updated',
        message: `${statusAction.invoice.invoiceNumber} transitioned to ${statusAction.targetStatus}.`,
        duration: 2300,
      });
    } catch {
      showError({ title: 'Network Error', message: 'Failed to update status.' });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({
        id: deleteTarget.id,
        businessId: deleteTarget.businessId,
        reason,
      });
      const res = await fetch(`/api/billing/invoices?${params.toString()}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showError({ title: 'Delete Failed', message: data.error || 'Could not delete document.' });
        return;
      }
      setDeleteTarget(null);
      await refreshAllData(activeBusiness.id);
      showSuccess({
        title: 'Document Removed',
        message: `${deleteTarget.invoiceNumber} permanently deleted with audit log.`,
        duration: 2400,
      });
    } catch {
      showError({ title: 'Network Error', message: 'Failed to delete document.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-[#0F172A]">
              {mode === 'quotations' ? 'Quotations & Proforma Invoices' : 'Invoices & Receipts Register'}
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {scope === 'active'
              ? `Filtered for ${activeBusiness.tradeName}`
              : 'Group-wide view across ChittorTech, Mewari Achaar & Visit Chittorgarh'}{' '}
            • {filtered.length} document(s)
          </p>
        </div>

        <button
          type="button"
          onClick={() => onCreateNew(mode === 'quotations' ? 'QUOTATION' : 'TAX_INVOICE')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          {mode === 'quotations' ? 'New Quotation / Proforma' : 'Create Tax Invoice'}
        </button>
      </div>

      {/* Filter Card (Exact LMS PreviousRecords md:grid-cols-12 grid) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, client name, or GSTIN..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="md:col-span-4 flex items-center justify-end gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setScope('active')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                scope === 'active' ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-slate-600'
              }`}
            >
              {activeBusiness.tradeName}
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                scope === 'all' ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-slate-600'
              }`}
            >
              All Group Entities
            </button>
          </div>
        </div>
      </div>

      {/* LMS Dark-Header Table (min-w-[1150px] in overflow-x-auto) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-9 h-9 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No matching billing documents</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first GST invoice, quotation, or receipt using the button above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-300">
            <table className="w-full min-w-[1150px] text-left border-collapse border border-slate-300 text-xs shadow-xs">
              <thead>
                <tr>
                  <th className="py-3.5 px-3.5 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Issue Date
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Doc No
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Entity / Type
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Customer
                  </th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Taxable
                  </th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-slate-700 bg-indigo-950 text-indigo-100 font-bold">
                    GST
                  </th>
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap border-r border-slate-700 bg-emerald-950 text-emerald-100 font-bold">
                    Grand Total
                  </th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Balance Due
                  </th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Status
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap bg-slate-900 text-slate-100 font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const biz = businessMap[inv.businessId] || inv.businessSnapshot;
                  return (
                    <tr key={inv.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50/40">
                      <td className="py-3 px-3.5 whitespace-nowrap border-r border-b border-slate-200 font-mono text-slate-700">
                        {formatDateDDMMYYYY(inv.issueDate)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap border-r border-b border-slate-200 font-mono text-xs font-bold text-blue-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap border-r border-b border-slate-200">
                        <span className="font-bold text-slate-800">{biz.tradeName}</span>
                        <span className="block text-[10px] text-slate-500">
                          {inv.documentType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-b border-slate-200 max-w-[200px]">
                        <div className="font-semibold text-slate-800 truncate">{inv.customer.name}</div>
                        {inv.customer.gstin && (
                          <div className="text-[10px] font-mono text-slate-500">{inv.customer.gstin}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs whitespace-nowrap border-r border-b border-slate-200">
                        {formatINR(inv.taxableValue, inv.currencySymbol)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs whitespace-nowrap border-r border-b border-slate-200 bg-indigo-50/40">
                        {formatINR(inv.taxTotal, inv.currencySymbol)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-xs font-black whitespace-nowrap border-r border-b border-slate-200 bg-emerald-50 text-emerald-950">
                        {formatINR(inv.grandTotal, inv.currencySymbol)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-bold whitespace-nowrap border-r border-b border-slate-200 text-amber-800">
                        {formatINR(inv.balanceDue, inv.currencySymbol)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap border-r border-b border-slate-200">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            STATUS_STYLE[inv.status]
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap border-b border-slate-200 bg-slate-50/30">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewInvoice(inv)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-blue-700 hover:bg-blue-50"
                            title="Preview / Print / Download A4 PDF"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditInvoice(inv)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            title="Edit Document"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateInvoice(inv)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            title="Duplicate into New Draft"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() =>
                                setStatusAction({ invoice: inv, targetStatus: 'PAID' })
                              }
                              className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              title="Mark Full Amount Paid"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {inv.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() =>
                                setStatusAction({ invoice: inv, targetStatus: 'CANCELLED' })
                              }
                              className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              title="Cancel Document"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(inv)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* A4 Preview & PDF Download Modal */}
      <InvoicePreviewModal
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />

      {/* LMS-style Status Transition Confirmation Modal */}
      <ConfirmActionModal
        isOpen={Boolean(statusAction)}
        variant={statusAction?.targetStatus === 'CANCELLED' ? 'warning' : 'status'}
        title={
          statusAction?.targetStatus === 'CANCELLED'
            ? 'Cancel Billing Document'
            : 'Confirm Status Transition'
        }
        subtitle="Audit-Logged Status Change"
        description={
          statusAction?.targetStatus === 'CANCELLED'
            ? 'Cancelling retains the invoice number for GST compliance sequencing while zeroing balance due.'
            : 'Updating status will reconcile paid and balance totals in billing_details.'
        }
        targetLabel={statusAction?.invoice.invoiceNumber}
        fromValue={statusAction?.invoice.status}
        toValue={statusAction?.targetStatus}
        requireReason={statusAction?.targetStatus === 'CANCELLED'}
        showReasonInput
        reasonPresets={
          statusAction?.targetStatus === 'CANCELLED'
            ? ['Issued in Error', 'Customer Order Cancelled', 'Superseded by Revised Invoice']
            : ['Full Settlement Verified', 'Bank / UPI Cleared']
        }
        confirmLabel={
          statusAction?.targetStatus === 'CANCELLED' ? 'Cancel Document' : 'Mark as Paid'
        }
        busy={busy}
        onCancel={() => setStatusAction(null)}
        onConfirm={handleStatusConfirm}
      />

      {/* LMS-style Delete Confirmation Modal */}
      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        variant="danger"
        title="Permanently Delete Document"
        subtitle="Irreversible Record Removal"
        description="For GST compliance, consider cancelling finalized invoices instead of deleting them. Deleting permanently removes this document from billing_details."
        targetLabel={deleteTarget?.invoiceNumber}
        requireReason
        reasonPresets={['Draft Cleanup', 'Duplicate Test Entry']}
        confirmLabel="Confirm Permanent Delete"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

