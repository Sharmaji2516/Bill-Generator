'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import gsap from 'gsap';
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  FileCheck2,
  Users,
  Package,
  Wallet,
  BarChart3,
  ScrollText,
  Settings,
  Database,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  IndianRupee,
  Crown,
} from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { BillingDocumentType, BillingInvoice, DashboardTab } from '@/types';
import { formatDateDDMMYYYY, formatINR } from '@/lib/billing/gstEngine';
import { InvoiceBuilder } from './InvoiceBuilder';
import { InvoicesListView } from './InvoicesListView';
import { CustomersView } from './CustomersView';
import { ProductsView } from './ProductsView';
import { PaymentsView } from './PaymentsView';
import { ReportsView } from './ReportsView';
import { TermsGeneratorView } from './TermsGeneratorView';
import { BusinessSettingsView } from './BusinessSettingsView';
import { InvoicePreviewModal } from './templates/InvoicePreviewModal';

interface BillingDashboardProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const NAV_TABS: { id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'new_invoice', label: 'New Document', icon: FilePlus2 },
  { id: 'invoices', label: 'Invoices & Receipts', icon: FileText },
  { id: 'quotations', label: 'Quotations & Proforma', icon: FileCheck2 },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'products', label: 'Catalog', icon: Package },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'reports', label: 'GST Reports', icon: BarChart3 },
  { id: 'terms', label: 'Terms Builder', icon: ScrollText },
  { id: 'business_settings', label: 'Businesses & Audit', icon: Settings },
];

export const BillingDashboard: React.FC<BillingDashboardProps> = ({
  activeTab,
  onTabChange,
}) => {
  const {
    activeBusiness,
    businesses,
    businessMap,
    collectionStatus,
    invoices,
    customers,
    dataLoading,
    refreshAllData,
    setActiveBusinessId,
  } = useBusiness();

  const contentRef = useRef<HTMLDivElement>(null);

  const [editingInvoice, setEditingInvoice] = useState<BillingInvoice | null>(null);
  const [duplicateInvoice, setDuplicateInvoice] = useState<BillingInvoice | null>(null);
  const [defaultDocType, setDefaultDocType] = useState<BillingDocumentType>('TAX_INVOICE');
  const [quickPreviewInvoice, setQuickPreviewInvoice] = useState<BillingInvoice | null>(null);

  // Subtle LMS GSAP tab entrance transition respecting prefers-reduced-motion
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !contentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    });
    return () => ctx.revert();
  }, [activeTab]);

  const entityInvoices = useMemo(
    () => invoices.filter((i) => i.businessId === activeBusiness.id && i.status !== 'CANCELLED'),
    [invoices, activeBusiness.id]
  );

  const metrics = useMemo(() => {
    const totalBilled = entityInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalCollected = entityInvoices.reduce((s, i) => s + i.amountPaid, 0);
    const totalPending = entityInvoices.reduce((s, i) => s + i.balanceDue, 0);
    const totalGst = entityInvoices.reduce((s, i) => s + i.taxTotal, 0);
    const paidCount = entityInvoices.filter((i) => i.status === 'PAID').length;
    return { totalBilled, totalCollected, totalPending, totalGst, paidCount };
  }, [entityInvoices]);

  const startNewDocument = (docType: BillingDocumentType = 'TAX_INVOICE') => {
    setEditingInvoice(null);
    setDuplicateInvoice(null);
    setDefaultDocType(docType);
    onTabChange('new_invoice');
  };

  const handleEditFromList = (inv: BillingInvoice) => {
    setActiveBusinessId(inv.businessId);
    setDuplicateInvoice(null);
    setEditingInvoice(inv);
    onTabChange('new_invoice');
  };

  const handleDuplicateFromList = (inv: BillingInvoice) => {
    setActiveBusinessId(inv.businessId);
    setEditingInvoice(null);
    setDuplicateInvoice(inv);
    onTabChange('new_invoice');
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Horizontal Floating Navigation Bar (Exact LMS LaboratoryDashboard Bar) */}
      <div className="w-full bg-[#EAF3FF] rounded-2xl border border-[#D6E8FF] shadow-2xs p-1.5 overflow-x-auto">
        <nav className="flex items-stretch gap-1 w-full min-w-max">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id !== 'new_invoice') {
                    setEditingInvoice(null);
                    setDuplicateInvoice(null);
                  }
                  onTabChange(tab.id);
                }}
                className={`flex-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#D6E8FF] text-[#2563EB] shadow-2xs'
                    : 'text-[#334155] hover:bg-white/60 hover:text-[#2563EB]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Firestore Manual Collection Setup Alert (if billing_details has 0 docs) */}
      {collectionStatus && !collectionStatus.collectionReady && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Firestore Collection &quot;billing_details&quot; Not Yet Initialized in Firebase Console
              </p>
              <p className="text-[11px] mt-0.5 leading-relaxed">
                {collectionStatus.message} Application code intentionally does NOT auto-create collections. Once you create <code className="font-mono font-bold">billing_details</code> manually inside project <code className="font-mono font-bold">{collectionStatus.projectId}</code>, click Recheck Connection.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refreshAllData(activeBusiness.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400 bg-white px-3.5 py-2 font-bold text-amber-900 hover:bg-amber-100 shrink-0 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
            Recheck Connection
          </button>
        </div>
      )}

      {/* Main Active Tab Canvas */}
      <div ref={contentRef}>
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Welcome / Active Entity Overview Card (Exact LMS LaboratoryDashboard Welcome Banner) */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 sm:p-7 shadow-2xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF3FF] border border-[#D6E8FF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                    {activeBusiness.isParent ? (
                      <>
                        <Crown className="w-3 h-3" /> Group Parent Entity
                      </>
                    ) : (
                      <>Subsidiary under {activeBusiness.parentBusinessName}</>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#334155] mt-1.5">
                    {activeBusiness.tradeName} Billing Console
                  </h2>
                  <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                    {activeBusiness.legalName} • Prefix:{' '}
                    <span className="font-mono font-bold text-[#2563EB]">
                      {activeBusiness.invoicePrefix}
                    </span>
                    {activeBusiness.gstin ? ` • GSTIN: ${activeBusiness.gstin}` : ' • Configure GSTIN in Settings'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => refreshAllData(activeBusiness.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#334155] hover:bg-slate-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
                    Sync Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => startNewDocument('TAX_INVOICE')}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm"
                  >
                    <FilePlus2 className="w-4 h-4" />
                    Issue New Invoice
                  </button>
                </div>
              </div>
            </div>

            {/* 4 KPI Cards (Exact LMS grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Gross Billed ({activeBusiness.tradeName})
                </p>
                <div className="text-2xl font-extrabold text-[#0F172A] font-mono mt-1.5">
                  {formatINR(metrics.totalBilled, activeBusiness.defaultCurrency)}
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Across {entityInvoices.length} active document(s)
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Collected Revenue
                </p>
                <div className="text-2xl font-extrabold text-[#15803D] font-mono mt-1.5">
                  {formatINR(metrics.totalCollected, activeBusiness.defaultCurrency)}
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  {metrics.paidCount} settled document(s)
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Pending Receivables
                </p>
                <div className="text-2xl font-extrabold text-[#B45309] font-mono mt-1.5">
                  {formatINR(metrics.totalPending, activeBusiness.defaultCurrency)}
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Open customer balance due
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  GST Liability &amp; Clients
                </p>
                <div className="text-2xl font-extrabold text-[#2563EB] font-mono mt-1.5">
                  {formatINR(metrics.totalGst, activeBusiness.defaultCurrency)}
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  {customers.length} saved customer account(s)
                </p>
              </div>
            </div>

            {/* 8/4 Split Grid (Exact LMS Dashboard grid-cols-1 lg:grid-cols-12 gap-6) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 Cols: Recent Entity Documents */}
              <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Recent Billing Documents ({activeBusiness.tradeName})
                    </h3>
                    <p className="text-[11px] text-[#64748B]">
                      Click any document number for instant A4 preview &amp; PDF export
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTabChange('invoices')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline"
                  >
                    View Register <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {entityInvoices.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                    <IndianRupee className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      No billing documents yet for {activeBusiness.tradeName}
                    </p>
                    <button
                      type="button"
                      onClick={() => startNewDocument('TAX_INVOICE')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-bold text-white"
                    >
                      Create First Invoice
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto border-t border-slate-300">
                    <table className="w-full min-w-[550px] text-left border-collapse border border-slate-300 text-xs shadow-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-100">
                          <th className="py-2.5 px-3 border-r border-slate-700">Date</th>
                          <th className="py-2.5 px-3 border-r border-slate-700">Doc No</th>
                          <th className="py-2.5 px-3 border-r border-slate-700">Customer</th>
                          <th className="py-2.5 px-3 text-right border-r border-slate-700">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entityInvoices.slice(0, 6).map((inv) => (
                          <tr
                            key={inv.id}
                            className="odd:bg-white even:bg-slate-50 hover:bg-blue-50/50"
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-b border-slate-200 whitespace-nowrap">
                              {formatDateDDMMYYYY(inv.issueDate)}
                            </td>
                            <td className="py-2.5 px-3 border-r border-b border-slate-200 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setQuickPreviewInvoice(inv)}
                                className="font-mono font-bold text-[#2563EB] hover:underline"
                              >
                                {inv.invoiceNumber}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 border-r border-b border-slate-200 truncate max-w-[160px]">
                              {inv.customer.name}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-b border-slate-200 whitespace-nowrap">
                              {formatINR(inv.grandTotal, inv.currencySymbol)}
                            </td>
                            <td className="py-2.5 px-3 text-center border-b border-slate-200">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right 4 Cols: Group Entities & Quick Shortcuts */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#0F172A]">ChittorTech Group Switcher</h3>
                    <span className="text-[10px] font-bold text-[#2563EB]">3 Entities</span>
                  </div>
                  <div className="space-y-2">
                    {businesses.map((b) => {
                      const count = invoices.filter(
                        (i) => i.businessId === b.id && i.status !== 'CANCELLED'
                      ).length;
                      const isCurrent = b.id === activeBusiness.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setActiveBusinessId(b.id)}
                          className={`w-full rounded-xl border p-3 text-left transition-all flex items-center justify-between ${
                            isCurrent
                              ? 'border-[#2563EB] bg-[#EAF3FF] text-[#1E40AF]'
                              : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">{b.tradeName}</p>
                            <p className="text-[10px] text-slate-500">
                              {b.isParent ? 'Parent Entity' : 'Subsidiary'} • Prefix {b.invoicePrefix}
                            </p>
                          </div>
                          <span className="font-mono text-xs font-bold">{count} docs</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2.5">
                  <h3 className="text-sm font-bold text-[#0F172A]">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => startNewDocument('TAX_INVOICE')}
                      className="rounded-xl border border-blue-200 bg-[#EAF3FF] px-3 py-2.5 font-bold text-[#2563EB] hover:bg-[#D6E8FF] text-left"
                    >
                      + GST Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => startNewDocument('QUOTATION')}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-700 hover:bg-slate-100 text-left"
                    >
                      + Quotation
                    </button>
                    <button
                      type="button"
                      onClick={() => onTabChange('payments')}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 font-bold text-emerald-800 hover:bg-emerald-100 text-left"
                    >
                      Post Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => onTabChange('reports')}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-700 hover:bg-slate-100 text-left"
                    >
                      GSTR-1 Export
                    </button>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Database className="w-3.5 h-3.5 text-[#0F9D92]" />
                      Collection: billing_details
                    </span>
                    <button
                      type="button"
                      onClick={() => onTabChange('business_settings')}
                      className="font-bold text-[#2563EB] hover:underline"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'new_invoice' && (
          <InvoiceBuilder
            key={`${activeBusiness.id}-${editingInvoice?.id || duplicateInvoice?.id || defaultDocType}`}
            initialInvoice={editingInvoice}
            duplicateSource={duplicateInvoice}
            defaultDocumentType={defaultDocType}
            onSavedSuccess={() => {
              setEditingInvoice(null);
              setDuplicateInvoice(null);
              onTabChange('invoices');
            }}
          />
        )}

        {(activeTab === 'invoices' || activeTab === 'quotations') && (
          <InvoicesListView
            mode={activeTab === 'quotations' ? 'quotations' : 'invoices'}
            onEditInvoice={handleEditFromList}
            onDuplicateInvoice={handleDuplicateFromList}
            onCreateNew={startNewDocument}
          />
        )}

        {activeTab === 'customers' && <CustomersView />}
        {activeTab === 'products' && <ProductsView />}
        {activeTab === 'payments' && <PaymentsView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'terms' && <TermsGeneratorView />}
        {activeTab === 'business_settings' && <BusinessSettingsView />}
      </div>

      <InvoicePreviewModal
        invoice={quickPreviewInvoice}
        onClose={() => setQuickPreviewInvoice(null)}
      />
    </div>
  );
};

