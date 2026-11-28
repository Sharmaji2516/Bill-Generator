'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Database,
  History,
  Crown,
} from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';
import { getPendingBusinessFields, INDIAN_STATES } from '@/lib/billing/businesses';
import { BillingAuditEntry, BusinessProfile, InvoiceTemplateId } from '@/types';
import { formatDateDDMMYYYY } from '@/lib/billing/gstEngine';

export const BusinessSettingsView: React.FC = () => {
  const {
    businesses,
    activeBusiness,
    setActiveBusinessId,
    collectionStatus,
    refreshBusinesses,
    refreshStatus,
  } = useBusiness();
  const { showSuccess, showError } = useConfirmationModal();

  const [form, setForm] = useState<BusinessProfile>(activeBusiness);
  const [termsText, setTermsText] = useState(activeBusiness.defaultTerms.join('\n'));
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<BillingAuditEntry[]>([]);

  useEffect(() => {
    setForm(activeBusiness);
    setTermsText((activeBusiness.defaultTerms || []).join('\n'));
  }, [activeBusiness]);

  useEffect(() => {
    const loadAudit = async () => {
      try {
        const res = await fetch(
          `/api/billing/audit?businessId=${encodeURIComponent(activeBusiness.id)}&limit=30`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(Array.isArray(data.logs) ? data.logs : []);
        }
      } catch {
        // ignore
      }
    };
    loadAudit();
  }, [activeBusiness.id]);

  const pendingFields = getPendingBusinessFields(form);

  const handleStateSelect = (stateName: string) => {
    const match = INDIAN_STATES.find((s) => s.name === stateName);
    setForm((prev) => ({
      ...prev,
      state: stateName,
      stateCode: match ? match.code : prev.stateCode,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: BusinessProfile = {
        ...form,
        defaultTerms: termsText
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const res = await fetch('/api/billing/businesses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showError({
          title: res.status === 412 ? 'Manual Firestore Setup Needed' : 'Save Failed',
          message: data.error || 'Could not update business profile.',
        });
        return;
      }

      await refreshBusinesses();
      await refreshStatus();
      showSuccess({
        title: 'Business Profile Saved',
        message: `${form.tradeName} legal, GST, banking, and numbering rules persisted to billing_details.`,
        duration: 2600,
      });
    } catch {
      showError({ title: 'Network Error', message: 'Failed to save business configuration.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Multi-Business Selector Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#2563EB]" />
              Multi-Business Hierarchy &amp; Settings
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ChittorTech (Parent) supervises Mewari Achaar and Visit Chittorgarh with isolated legal details, GSTIN, prefixes, and ledgers.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <Database className="w-4 h-4 text-[#2563EB]" />
            <span className="font-mono font-semibold text-slate-700">
              chittor-tech / {collectionStatus?.collection || 'billing_details'}
            </span>
            {collectionStatus?.collectionReady ? (
              <span className="text-emerald-700 font-bold">Ready</span>
            ) : (
              <span className="text-amber-700 font-bold">Pending Manual Creation</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {businesses.map((biz) => {
            const selected = biz.id === activeBusiness.id;
            const pending = getPendingBusinessFields(biz);
            return (
              <button
                key={biz.id}
                type="button"
                onClick={() => setActiveBusinessId(biz.id)}
                className={`text-left rounded-2xl border p-4 transition-all ${
                  selected
                    ? 'border-[#2563EB] bg-[#EAF3FF]/60 ring-2 ring-[#2563EB]/20'
                    : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900">{biz.tradeName}</span>
                  {biz.isParent ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-bold">
                      <Crown className="w-3 h-3" /> Parent
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 text-slate-700 px-2 py-0.5 text-[10px] font-bold">
                      Subsidiary
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 truncate">{biz.legalName}</p>
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  Prefix: {biz.invoicePrefix} • {biz.gstin ? `GSTIN ${biz.gstin}` : 'GSTIN Needed'}
                </p>
                {pending.length > 0 && (
                  <p className="mt-2 text-[10px] font-bold text-amber-700">
                    {pending.length} setup field(s) remaining
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pending Setup Notice if Subsidiary Missing Official Info */}
      {pendingFields.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Official Details Incomplete for {form.tradeName}</p>
            <p className="mt-0.5 text-[11px]">
              Please verify and fill before issuing official tax invoices: {pendingFields.join(', ')}. (Unverified placeholders are intentionally left empty.)
            </p>
          </div>
        </div>
      )}

      {/* Business Editor Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm text-xs"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Configure: {form.tradeName}
            </h3>
            <p className="text-[11px] text-slate-500">
              {form.parentBusinessName
                ? `Managed subsidiary under ${form.parentBusinessName}`
                : 'Primary Group Parent Company'}
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Business Settings
          </button>
        </div>

        {/* Legal & Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Trade Name</label>
            <input
              type="text"
              required
              value={form.tradeName}
              onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Legal Name (For Invoices)</label>
            <input
              type="text"
              required
              value={form.legalName}
              onChange={(e) => setForm({ ...form, legalName: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tagline</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
            <input
              type="text"
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
            <input
              type="text"
              value={form.pan}
              onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Udyam Registration</label>
            <input
              type="text"
              value={form.udyamRegNo}
              onChange={(e) => setForm({ ...form, udyamRegNo: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Registered State</label>
            <select
              value={form.state}
              onChange={(e) => handleStateSelect(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
            >
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block font-bold text-slate-700 mb-1">Registered Business Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        {/* Bank & UPI */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Account Holder Name</label>
            <input
              type="text"
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Account Number</label>
            <input
              type="text"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
            <input
              type="text"
              value={form.ifscCode}
              onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">UPI ID</label>
            <input
              type="text"
              value={form.upiId}
              onChange={(e) => setForm({ ...form, upiId: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
            />
          </div>
        </div>

        {/* Document Prefixes & Template Defaults */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Invoice Prefix</label>
            <input
              type="text"
              value={form.invoicePrefix}
              onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Quote Prefix</label>
            <input
              type="text"
              value={form.quotationPrefix}
              onChange={(e) => setForm({ ...form, quotationPrefix: e.target.value.toUpperCase() })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Proforma Prefix</label>
            <input
              type="text"
              value={form.proformaPrefix}
              onChange={(e) => setForm({ ...form, proformaPrefix: e.target.value.toUpperCase() })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Receipt Prefix</label>
            <input
              type="text"
              value={form.receiptPrefix}
              onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value.toUpperCase() })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Credit Note</label>
            <input
              type="text"
              value={form.creditNotePrefix}
              onChange={(e) => setForm({ ...form, creditNotePrefix: e.target.value.toUpperCase() })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Debit Note</label>
            <input
              type="text"
              value={form.debitNotePrefix}
              onChange={(e) => setForm({ ...form, debitNotePrefix: e.target.value.toUpperCase() })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Default GST %</label>
            <select
              value={form.defaultGstRate}
              onChange={(e) => setForm({ ...form, defaultGstRate: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-mono"
            >
              {[0, 5, 12, 18, 28].map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Default Template</label>
            <select
              value={form.defaultTemplate}
              onChange={(e) =>
                setForm({ ...form, defaultTemplate: e.target.value as InvoiceTemplateId })
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
            >
              <option value="gst_tax">GST Tax</option>
              <option value="service_classic">Service Classic</option>
              <option value="modern">Modern</option>
              <option value="mewari">Mewari Weight</option>
            </select>
          </div>
        </div>

        {/* Default Terms */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Default Invoice Terms (one per line)
            </label>
            <textarea
              rows={4}
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 resize-none"
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Authorized Signatory Title</label>
              <input
                type="text"
                value={form.authorizedSignatory}
                onChange={(e) => setForm({ ...form, authorizedSignatory: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Invoice Footer Line</label>
              <input
                type="text"
                value={form.invoiceFooter}
                onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Audit Log Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#2563EB]" />
          <h3 className="text-sm font-bold text-slate-900">
            Recent Audit Trail ({activeBusiness.tradeName})
          </h3>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500">No audit entries recorded yet for this entity.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full min-w-[700px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-100">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Summary</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Actor</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="odd:bg-white even:bg-slate-50 border-t border-slate-200">
                    <td className="py-2 px-3 font-mono whitespace-nowrap">
                      {formatDateDDMMYYYY(log.createdAt)}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2 px-3 text-slate-800">{log.summary}</td>
                    <td className="py-2 px-3 text-slate-500">{log.reason || '—'}</td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {log.actorEmail}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

