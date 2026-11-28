'use client';

import React from 'react';
import { BillingInvoice } from '@/types';
import { formatDateDDMMYYYY, formatINR } from '@/lib/billing/gstEngine';
import { DigitalSealBadge } from './DigitalSealBadge';

interface TemplateProps {
  invoice: BillingInvoice;
}

export const ModernInvoiceTemplate: React.FC<TemplateProps> = ({ invoice }) => {
  const biz = invoice.businessSnapshot;
  const cust = invoice.customer;
  const sym = invoice.currencySymbol || '₹';

  return (
    <div
      className="bg-white text-slate-900 border border-slate-200 p-8 flex flex-col justify-between select-text"
      style={{ width: '794px', minHeight: '1122px', boxSizing: 'border-box' }}
    >
      <div className="space-y-6">
        {/* Clean Minimalist Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl border border-slate-200 p-2 bg-slate-50 flex items-center justify-center">
              <img
                src={biz.logoUrl || '/images/chittortech_logo.png'}
                alt={biz.tradeName}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{biz.tradeName}</h1>
              <p className="text-xs text-slate-500">{biz.legalName}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{biz.address}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              {invoice.documentType.replace(/_/g, ' ')}
            </span>
            <p className="text-lg font-mono font-extrabold text-slate-900 mt-1.5">
              {invoice.invoiceNumber}
            </p>
            <p className="text-[11px] text-slate-500">
              Issued {formatDateDDMMYYYY(invoice.issueDate)}
              {invoice.dueDate ? ` • Due ${formatDateDDMMYYYY(invoice.dueDate)}` : ''}
            </p>
          </div>
        </div>

        {/* Client & Summary Pills */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-7 rounded-2xl bg-[#F5F8FC] border border-[#E2E8F0] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Client / Recipient
            </p>
            <p className="text-sm font-bold text-slate-900 mt-1">{cust.name}</p>
            {cust.companyName && <p className="text-xs text-slate-700">{cust.companyName}</p>}
            {cust.address && <p className="text-xs text-slate-500 mt-1">{cust.address}</p>}
            <p className="text-[11px] text-slate-600 mt-1.5">
              {cust.phone && `${cust.phone}  `}
              {cust.email && `• ${cust.email}`}
              {cust.gstin && ` • GSTIN: ${cust.gstin}`}
            </p>
          </div>

          <div className="col-span-5 rounded-2xl bg-[#0F2942] text-white p-4 flex flex-col justify-between">
            <p className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">
              Total Payable Amount
            </p>
            <p className="text-2xl font-mono font-extrabold tracking-tight">
              {formatINR(invoice.grandTotal, sym)}
            </p>
            <p className="text-[10.5px] text-slate-300">
              Paid: {formatINR(invoice.amountPaid, sym)} • Balance:{' '}
              {formatINR(invoice.balanceDue, sym)}
            </p>
          </div>
        </div>

        {/* Modern Clean Line Items */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Unit Price</th>
                <th className="py-3 px-3 text-right">GST</th>
                <th className="py-3 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{item.description}</td>
                  <td className="py-3 px-3 text-right font-mono">{item.qty}</td>
                  <td className="py-3 px-3 text-right font-mono">{formatINR(item.rate, sym)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                    {formatINR(item.taxAmount, sym)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatINR(item.lineTotal, sym)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes, Settlement, & Seal */}
        <div className="grid grid-cols-12 gap-5 items-start pt-2">
          <div className="col-span-7 space-y-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs">
              <p className="text-[10px] font-bold uppercase text-slate-500">Amount in Words</p>
              <p className="font-bold text-slate-800 mt-0.5">{invoice.amountInWords}</p>
            </div>
            {invoice.terms.length > 0 && (
              <div className="text-[10.5px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-700">Terms &amp; Conditions</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {invoice.terms.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="col-span-5 text-right flex flex-col items-end space-y-3">
            <div className="w-full rounded-xl border border-slate-200 p-3.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Taxable</span>
                <span className="font-mono font-semibold">{formatINR(invoice.taxableValue, sym)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax (GST)</span>
                <span className="font-mono font-semibold">{formatINR(invoice.taxTotal, sym)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 font-extrabold text-sm text-blue-700">
                <span>Grand Total</span>
                <span className="font-mono">{formatINR(invoice.grandTotal, sym)}</span>
              </div>
            </div>
            <DigitalSealBadge seal={invoice.digitalSeal} businessName={biz.tradeName} compact />
          </div>
        </div>
      </div>

      {/* Modern Pill Contact Footer */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-2">
          {biz.phone && (
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
              {biz.phone}
            </span>
          )}
          {biz.email && (
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
              {biz.email}
            </span>
          )}
        </div>
        <span>{biz.gstin ? `GSTIN: ${biz.gstin}` : biz.legalName}</span>
      </div>
    </div>
  );
};

