'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  buildReportRows,
  exportReportToCsv,
  exportReportToExcel,
  exportReportToSummaryPdf,
} from '@/lib/billing/exportService';
import { formatINR } from '@/lib/billing/gstEngine';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';

type PeriodType = 'current_month' | 'previous_month' | 'financial_year' | 'all_time' | 'custom_range';
type ReportViewMode = 'gst_summary' | 'sales_register' | 'business_wise' | 'outstanding';

export const ReportsView: React.FC = () => {
  const { activeBusiness, businesses, businessMap, invoices } = useBusiness();
  const { showSuccess } = useConfirmationModal();

  const [reportMode, setReportMode] = useState<ReportViewMode>('gst_summary');
  const [periodType, setPeriodType] = useState<PeriodType>('all_time');
  const [entityScope, setEntityScope] = useState<'active' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    return invoices.filter((inv) => {
      if (inv.status === 'CANCELLED') return false;
      if (entityScope === 'active' && inv.businessId !== activeBusiness.id) return false;
      if (reportMode === 'outstanding' && inv.balanceDue <= 0) return false;

      if (periodType === 'all_time') return true;
      const dt = new Date(inv.issueDate);
      if (Number.isNaN(dt.getTime())) return true;

      if (periodType === 'current_month') {
        return dt.getFullYear() === curYear && dt.getMonth() === curMonth;
      }
      if (periodType === 'previous_month') {
        const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
        const prevYear = curMonth === 0 ? curYear - 1 : curYear;
        return dt.getFullYear() === prevYear && dt.getMonth() === prevMonth;
      }
      if (periodType === 'financial_year') {
        const fyStartYear = curMonth >= 3 ? curYear : curYear - 1;
        const fyStart = new Date(fyStartYear, 3, 1);
        const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59);
        return dt >= fyStart && dt <= fyEnd;
      }
      if (periodType === 'custom_range') {
        if (startDate && inv.issueDate < startDate) return false;
        if (endDate && inv.issueDate > endDate) return false;
      }
      return true;
    });
  }, [invoices, entityScope, activeBusiness.id, reportMode, periodType, startDate, endDate]);

  const summary = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, inv) => {
        acc.taxable += inv.taxableValue;
        acc.cgst += inv.cgstTotal;
        acc.sgst += inv.sgstTotal;
        acc.igst += inv.igstTotal;
        acc.totalGst += inv.taxTotal;
        acc.grand += inv.grandTotal;
        acc.paid += inv.amountPaid;
        acc.due += inv.balanceDue;
        return acc;
      },
      { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, grand: 0, paid: 0, due: 0 }
    );
  }, [filteredInvoices]);

  const entityBreakdown = useMemo(() => {
    return businesses.map((biz) => {
      const bizInvs = filteredInvoices.filter((i) => i.businessId === biz.id);
      return {
        biz,
        count: bizInvs.length,
        taxable: bizInvs.reduce((s, i) => s + i.taxableValue, 0),
        gst: bizInvs.reduce((s, i) => s + i.taxTotal, 0),
        grand: bizInvs.reduce((s, i) => s + i.grandTotal, 0),
        due: bizInvs.reduce((s, i) => s + i.balanceDue, 0),
      };
    });
  }, [businesses, filteredInvoices]);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const rows = buildReportRows(filteredInvoices, businessMap);
    const stamp = new Date().toISOString().split('T')[0];
    const base = `ChittorTech_${reportMode}_${stamp}`;

    if (format === 'csv') {
      exportReportToCsv(rows, `${base}.csv`);
    } else if (format === 'excel') {
      exportReportToExcel(rows, reportMode.toUpperCase(), `${base}.xlsx`);
    } else {
      exportReportToSummaryPdf(
        rows,
        `ChittorTech Billing Report — ${reportMode.replace(/_/g, ' ').toUpperCase()}`,
        `Period: ${periodType.replace(/_/g, ' ')} • Documents: ${rows.length}`,
        `${base}.pdf`
      );
    }

    showSuccess({
      title: 'Report Exported',
      message: `${rows.length} record(s) exported as ${format.toUpperCase()}.`,
      duration: 2100,
    });
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-[#0F172A]">
              GST Reports, Registers &amp; Exports
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            GSTR-1 tax breakdowns (CGST/SGST/IGST), entity-wise billing revenue, and receivables aging.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('excel')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" /> Summary PDF
          </button>
        </div>
      </div>

      {/* Period & Report Controls (Replicating LMS ReportsView grids) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'gst_summary', label: 'GST Tax (GSTR-1)' },
            { id: 'sales_register', label: 'Sales Register' },
            { id: 'business_wise', label: 'Entity Breakdown' },
            { id: 'outstanding', label: 'Outstanding Dues' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportMode(tab.id as ReportViewMode)}
              className={`px-3 py-2.5 rounded-xl font-bold border transition-all ${
                reportMode === tab.id
                  ? 'bg-[#D6E8FF] border-[#93C5FD] text-[#2563EB]'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Period Filter</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-semibold"
            >
              <option value="all_time">All Time</option>
              <option value="current_month">Current Month</option>
              <option value="previous_month">Previous Month</option>
              <option value="financial_year">Current Indian Financial Year</option>
              <option value="custom_range">Custom Date Range</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Entity Scope</label>
            <select
              value={entityScope}
              onChange={(e) => setEntityScope(e.target.value as 'active' | 'all')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-semibold"
            >
              <option value="all">All Group Entities (ChittorTech + Subsidiaries)</option>
              <option value="active">{activeBusiness.tradeName} Only</option>
            </select>
          </div>

          {periodType === 'custom_range' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-2.5 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-2.5 py-2"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GST & Revenue KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Taxable Value</p>
          <p className="text-xl font-extrabold font-mono text-slate-900 mt-1">
            {formatINR(summary.taxable)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Total Output GST</p>
          <p className="text-xl font-extrabold font-mono text-indigo-700 mt-1">
            {formatINR(summary.totalGst)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
            CGST {formatINR(summary.cgst)} • SGST {formatINR(summary.sgst)} • IGST {formatINR(summary.igst)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Gross Billed</p>
          <p className="text-xl font-extrabold font-mono text-[#2563EB] mt-1">
            {formatINR(summary.grand)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Pending Receivables</p>
          <p className="text-xl font-extrabold font-mono text-amber-700 mt-1">
            {formatINR(summary.due)}
          </p>
        </div>
      </div>

      {/* Multi-Business Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {entityBreakdown.map((row) => (
          <div
            key={row.biz.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">{row.biz.tradeName}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#EAF3FF] text-[#2563EB] font-bold text-[10px]">
                {row.count} Docs
              </span>
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Taxable Sales</span>
                <span className="font-mono font-semibold">{formatINR(row.taxable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GST Collected</span>
                <span className="font-mono font-semibold">{formatINR(row.gst)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Total Billed</span>
                <span className="font-mono">{formatINR(row.grand)}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-semibold">
                <span>Receivables</span>
                <span className="font-mono">{formatINR(row.due)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

