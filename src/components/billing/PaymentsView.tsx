'use client';

import React, { useState, useMemo } from 'react';
import { Wallet, Plus, Trash2, CheckCircle2, Loader2, X } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { formatDateDDMMYYYY, formatINR } from '@/lib/billing/gstEngine';
import { BillingPayment, PaymentMethod } from '@/types';

const METHODS: PaymentMethod[] = [
  'Bank Transfer',
  'UPI / PhonePe / GPay',
  'Cash',
  'Cheque',
  'Credit Card',
  'Other',
];

export const PaymentsView: React.FC = () => {
  const { activeBusiness, invoices, payments, refreshAllData } = useBusiness();
  const { showSuccess, showError } = useConfirmationModal();

  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('UPI / PhonePe / GPay');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BillingPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const entityOpenInvoices = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.businessId === activeBusiness.id &&
          i.status !== 'CANCELLED' &&
          i.status !== 'PAID' &&
          i.balanceDue > 0
      ),
    [invoices, activeBusiness.id]
  );

  const openModal = (preselectId?: string) => {
    const chosen =
      entityOpenInvoices.find((i) => i.id === preselectId) || entityOpenInvoices[0] || null;
    setInvoiceId(chosen?.id || '');
    setAmount(chosen?.balanceDue || 0);
    setMethod('UPI / PhonePe / GPay');
    setReferenceNo('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setModalOpen(true);
  };

  const handleInvoicePick = (id: string) => {
    setInvoiceId(id);
    const inv = entityOpenInvoices.find((i) => i.id === id);
    if (inv) setAmount(inv.balanceDue);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || amount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/billing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusiness.id,
          invoiceId,
          amount: Number(amount),
          method,
          referenceNo,
          paymentDate,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError({ title: 'Payment Failed', message: data.error || 'Could not record payment.' });
        return;
      }
      setModalOpen(false);
      await refreshAllData(activeBusiness.id);
      showSuccess({
        title: 'Payment Recorded',
        message: `${formatINR(amount, activeBusiness.defaultCurrency)} posted against ${data.invoice.invoiceNumber}. New status: ${data.invoice.status}.`,
        duration: 2600,
      });
    } catch {
      showError({ title: 'Network Error', message: 'Failed to record payment.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReversePayment = async (reason: string) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({
        id: deleteTarget.id,
        businessId: activeBusiness.id,
        reason,
      });
      const res = await fetch(`/api/billing/payments?${params.toString()}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showError({ title: 'Reversal Failed', message: data.error || 'Could not reverse payment.' });
        return;
      }
      setDeleteTarget(null);
      await refreshAllData(activeBusiness.id);
      showSuccess({
        title: 'Payment Reversed',
        message: 'Payment deleted and linked invoice balance recalculated cleanly.',
        duration: 2500,
      });
    } catch {
      showError({ title: 'Network Error', message: 'Failed to reverse payment.' });
    } finally {
      setDeleting(false);
    }
  };

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = entityOpenInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-[#0F172A]">
              Payments &amp; Receivables • {activeBusiness.tradeName}
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Track partial and full settlements with atomic invoice balance reconciliation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal()}
          disabled={entityOpenInvoices.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Collected ({activeBusiness.tradeName})
          </p>
          <p className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">
            {formatINR(totalCollected, activeBusiness.defaultCurrency)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Pending Receivables
          </p>
          <p className="text-2xl font-extrabold text-amber-700 font-mono mt-1">
            {formatINR(totalOutstanding, activeBusiness.defaultCurrency)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Open Unpaid / Partial Invoices
          </p>
          <p className="text-2xl font-extrabold text-[#2563EB] font-mono mt-1">
            {entityOpenInvoices.length}
          </p>
        </div>
      </div>

      {/* Payment Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Wallet className="w-9 h-9 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No payments recorded yet</p>
            <p className="text-xs text-slate-500">
              Record settlements against issued invoices to automatically transition status to PARTIAL or PAID.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-300">
            <table className="w-full min-w-[880px] text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr>
                  <th className="py-3.5 px-3.5 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Date
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Invoice No
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Customer
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Method / Reference
                  </th>
                  <th className="py-3.5 px-3.5 text-right whitespace-nowrap border-r border-slate-700 bg-emerald-950 text-emerald-100 font-bold">
                    Amount
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap bg-slate-900 text-slate-100 font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="odd:bg-white even:bg-slate-50">
                    <td className="py-3 px-3.5 whitespace-nowrap border-r border-b border-slate-200 font-mono">
                      {formatDateDDMMYYYY(p.paymentDate)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap border-r border-b border-slate-200 font-mono font-bold text-blue-900">
                      {p.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 border-r border-b border-slate-200 font-semibold text-slate-800">
                      {p.customerName}
                    </td>
                    <td className="py-3 px-3 border-r border-b border-slate-200 text-slate-600">
                      <span className="font-semibold text-slate-800">{p.method}</span>
                      {p.referenceNo && (
                        <span className="block font-mono text-[10px] text-slate-500">
                          Ref: {p.referenceNo}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap border-r border-b border-slate-200 font-mono font-extrabold bg-emerald-50 text-emerald-900">
                      {formatINR(p.amount, activeBusiness.defaultCurrency)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-rose-700 hover:border-rose-300"
                        title="Reverse / Delete Payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleRecordPayment}
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto"
          >
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Record Invoice Settlement</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Invoice</label>
                <select
                  required
                  value={invoiceId}
                  onChange={(e) => handleInvoicePick(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                >
                  {entityOpenInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.customer.name} (Due:{' '}
                      {formatINR(inv.balanceDue, inv.currencySymbol)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Received</label>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">UTR / Reference No</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="UTR / Txn ID / Cheque No"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Post Settlement
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        variant="danger"
        title="Reverse & Delete Payment"
        subtitle="Atomic Balance Recalculation"
        description="Reversing this payment will automatically update the parent invoice's paid and balance-due totals."
        targetLabel={
          deleteTarget ? `${deleteTarget.invoiceNumber} (${formatINR(deleteTarget.amount)})` : ''
        }
        requireReason
        reasonPresets={['Bounced Cheque', 'Duplicate Payment Entry', 'Incorrect Reference']}
        confirmLabel="Confirm Reversal"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleReversePayment}
      />
    </div>
  );
};

