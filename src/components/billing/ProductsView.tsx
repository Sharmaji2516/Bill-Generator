'use client';

import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, Edit3, Trash2, X, Save, Loader2 } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { formatINR } from '@/lib/billing/gstEngine';
import { BillingProduct } from '@/types';

const EMPTY_PRODUCT = {
  id: '',
  name: '',
  description: '',
  itemType: 'service' as 'service' | 'product',
  hsnSac: '998314',
  unit: 'Units',
  defaultWeight: '',
  price: 0,
  gstRate: 18,
  category: 'IT & Software',
  active: true,
};

export const ProductsView: React.FC = () => {
  const { activeBusiness, products, refreshAllData } = useBusiness();
  const { showSuccess, showError } = useConfirmationModal();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BillingProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.hsnSac.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const openCreate = () => {
    setForm({
      ...EMPTY_PRODUCT,
      gstRate: activeBusiness.defaultGstRate,
    });
    setModalOpen(true);
  };

  const openEdit = (p: BillingProduct) => {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description || '',
      itemType: p.itemType,
      hsnSac: p.hsnSac || '',
      unit: p.unit || 'Units',
      defaultWeight: p.defaultWeight || '',
      price: p.price,
      gstRate: p.gstRate,
      category: p.category || 'General',
      active: p.active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/billing/products', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          id: form.id || undefined,
          businessId: activeBusiness.id,
          price: Number(form.price) || 0,
          gstRate: Number(form.gstRate) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError({ title: 'Could Not Save Item', message: data.error || 'Save failed.' });
        return;
      }
      setModalOpen(false);
      await refreshAllData(activeBusiness.id);
      showSuccess({
        title: form.id ? 'Catalog Item Updated' : 'Catalog Item Added',
        message: `${data.product.name} saved to ${activeBusiness.tradeName}.`,
        duration: 2200,
      });
    } catch {
      showError({ title: 'Network Error', message: 'Failed to save catalog item.' });
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
      const res = await fetch(`/api/billing/products?${params.toString()}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showError({ title: 'Delete Failed', message: data.error || 'Could not remove item.' });
        return;
      }
      setDeleteTarget(null);
      await refreshAllData(activeBusiness.id);
      showSuccess({
        title: 'Item Removed',
        message: `${deleteTarget.name} removed cleanly.`,
        duration: 2200,
      });
    } catch {
      showError({ title: 'Network Error', message: 'Failed to delete item.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-[#0F172A]">
              Products &amp; Services Catalog • {activeBusiness.tradeName}
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Reusable line items with HSN/SAC codes, GST %, unit rates, and optional weight defaults ({products.length} items).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Product / Service
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items by title, HSN/SAC code, or category..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div className="md:col-span-6 flex items-center justify-end text-xs text-slate-500">
          Catalog entries: <strong className="ml-1 text-slate-800">{filtered.length}</strong>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Package className="w-9 h-9 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No catalog items yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Save your services, software packages, consulting retainers, or weighed products for instant 1-click invoice entry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-300">
            <table className="w-full min-w-[900px] text-left border-collapse border border-slate-300 text-xs shadow-xs">
              <thead>
                <tr>
                  <th className="py-3.5 px-3.5 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Service / Product Name
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Type / Category
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    HSN / SAC
                  </th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Unit Price
                  </th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    GST %
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap bg-slate-900 text-slate-100 font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50/40">
                    <td className="py-3 px-3.5 border-r border-b border-slate-200">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-slate-500 max-w-md truncate">{p.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap border-r border-b border-slate-200">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#EAF3FF] text-[#2563EB]">
                        {p.itemType}
                      </span>
                      <span className="ml-1.5 text-slate-600">{p.category}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap border-r border-b border-slate-200 font-mono font-semibold text-slate-700">
                      {p.hsnSac || '—'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap border-r border-b border-slate-200 font-mono font-bold text-slate-900">
                      {formatINR(p.price, activeBusiness.defaultCurrency)} / {p.unit}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap border-r border-b border-slate-200 font-mono">
                      {p.gstRate}%
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap border-b border-slate-200">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-blue-700 hover:border-blue-300"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-rose-700 hover:border-rose-300"
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {form.id ? 'Edit Catalog Item' : 'New Product / Service'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Item / Service Name <span className="text-rose-600">*</span>
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
                <label className="block font-bold text-slate-700 mb-1">Item Type</label>
                <select
                  value={form.itemType}
                  onChange={(e) => setForm({ ...form, itemType: e.target.value as 'service' | 'product' })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="service">Service (SAC)</option>
                  <option value="product">Goods / Product (HSN)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">HSN / SAC Code</label>
                <input
                  type="text"
                  value={form.hsnSac}
                  onChange={(e) => setForm({ ...form, hsnSac: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Unit Price</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">GST Rate (%)</label>
                <select
                  value={form.gstRate}
                  onChange={(e) => setForm({ ...form, gstRate: Number(e.target.value) })}
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
                <label className="block font-bold text-slate-700 mb-1">Unit (e.g. Units, Kg, Hours)</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Weight (Optional)</label>
                <input
                  type="text"
                  value={form.defaultWeight}
                  onChange={(e) => setForm({ ...form, defaultWeight: e.target.value })}
                  placeholder="e.g. 500g / 1kg"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Default Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 resize-none"
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
                Save Catalog Item
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        variant="danger"
        title="Delete Catalog Item"
        subtitle="Audit-Logged Removal"
        description="Confirm permanent removal of this item from the entity catalog."
        targetLabel={deleteTarget?.name}
        showReasonInput
        reasonPresets={['Discontinued Item', 'Duplicate Entry']}
        confirmLabel="Confirm Delete"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

