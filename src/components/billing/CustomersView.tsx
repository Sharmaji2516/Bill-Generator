'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Save,
  Loader2,
  Building,
  Phone,
  Mail,
} from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { INDIAN_STATES } from '@/lib/billing/businesses';
import { BillingCustomer } from '@/types';

const EMPTY_FORM = {
  id: '',
  name: '',
  companyName: '',
  email: '',
  phone: '',
  gstin: '',
  pan: '',
  address: '',
  state: 'Rajasthan',
  stateCode: '08',
  notes: '',
};

export const CustomersView: React.FC = () => {
  const { activeBusiness, customers, refreshAllData } = useBusiness();
  const { showSuccess, showError } = useConfirmationModal();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BillingCustomer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c: BillingCustomer) => {
    setForm({
      id: c.id,
      name: c.name,
      companyName: c.companyName || '',
      email: c.email || '',
      phone: c.phone || '',
      gstin: c.gstin || '',
      pan: c.pan || '',
      address: c.address || '',
      state: c.state || 'Rajasthan',
      stateCode: c.stateCode || '08',
      notes: c.notes || '',
    });
    setModalOpen(true);
  };

  const handleStateChange = (stateName: string) => {
    const found = INDIAN_STATES.find((s) => s.name === stateName);
    setForm((prev) => ({
      ...prev,
      state: stateName,
      stateCode: found ? found.code : prev.stateCode,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/billing/customers', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          id: form.id || undefined,
          businessId: activeBusiness.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError({ title: 'Could Not Save Customer', message: data.error || 'Save failed.' });
        return;
      }
      setModalOpen(false);
      await refreshAllData(activeBusiness.id);
      showSuccess({
        title: form.id ? 'Customer Updated' : 'Customer Added',
        message: `${data.customer.name} saved under ${activeBusiness.tradeName}.`,
        duration: 2400,
      });
    } catch {
      showError({ title: 'Network Error', message: 'Failed to save customer record.' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (reason: string) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({
        id: deleteTarget.id,
        businessId: activeBusiness.id,
        reason,
      });
      const res = await fetch(`/api/billing/customers?${params.toString()}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showError({ title: 'Delete Failed', message: data.error || 'Could not remove customer.' });
        return;
      }
      setDeleteTarget(null);
      await refreshAllData(activeBusiness.id);
      showSuccess({
        title: 'Customer Deleted',
        message: `${deleteTarget.name} was removed and recorded in the audit trail.`,
        duration: 2400,
      });
    } catch {
      showError({ title: 'Network Error', message: 'Failed to delete customer.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-[#0F172A]">
              Customer Directory • {activeBusiness.tradeName}
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Entity-isolated GSTIN, Place of Supply, and billing contact records ({customers.length} total).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add New Customer
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, company, GSTIN, phone, or email..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 focus:outline-none"
          />
        </div>
        <div className="md:col-span-6 flex items-center justify-end text-xs text-slate-500">
          Showing <strong className="mx-1 text-slate-800">{filtered.length}</strong> of{' '}
          <strong className="mx-1 text-slate-800">{customers.length}</strong> customers
        </div>
      </div>

      {/* Customers Table (LMS Dark-Header Bordered Style) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Users className="w-9 h-9 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No customers found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add B2B or B2C billing clients for {activeBusiness.tradeName} to auto-fill invoices with GSTIN and state codes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-300">
            <table className="w-full min-w-[920px] text-left border-collapse border border-slate-300 text-xs shadow-xs">
              <thead>
                <tr>
                  <th className="py-3.5 px-3.5 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Client / Contact
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Company
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    GSTIN / PAN
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    State / Code
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Contact Info
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap bg-slate-900 text-slate-100 font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-3.5 whitespace-nowrap border-r border-b border-slate-200 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-3 px-3 border-r border-b border-slate-200 text-slate-700 max-w-[180px] truncate">
                      {c.companyName || '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap border-r border-b border-slate-200 font-mono text-xs">
                      <span className="font-bold text-blue-900">{c.gstin || 'Unregistered'}</span>
                      {c.pan && <span className="block text-[10px] text-slate-500">PAN: {c.pan}</span>}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap border-r border-b border-slate-200 text-slate-700">
                      {c.state ? `${c.state} (${c.stateCode || '--'})` : '—'}
                    </td>
                    <td className="py-3 px-3 border-r border-b border-slate-200 text-slate-600 max-w-[220px]">
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        {c.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> {c.phone}
                          </span>
                        )}
                        {c.email && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 text-slate-400" /> {c.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap border-b border-slate-200">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-blue-700 hover:border-blue-300 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-rose-700 hover:border-rose-300 transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {form.id ? 'Edit Customer Record' : 'New Customer Record'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Client / Contact Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Firm Name</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="08XXXXXXXXXX1Z5"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={form.pan}
                  onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">State (Place of Supply)</label>
                <select
                  value={form.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white focus:border-[#2563EB] focus:outline-none"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">GST State Code</label>
                <input
                  type="text"
                  value={form.stateCode}
                  onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 resize-none focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-xs font-bold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        variant="danger"
        title="Delete Customer Record"
        subtitle="Audit-Logged Removal"
        description="Are you sure you want to delete this customer from the active directory? Historical invoices remain unaffected."
        targetLabel={deleteTarget?.name}
        showReasonInput
        reasonPresets={['Duplicate Entry', 'Test Record', 'Client Closed Account']}
        confirmLabel="Confirm Delete"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

