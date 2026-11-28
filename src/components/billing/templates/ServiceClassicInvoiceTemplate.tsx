'use client';

import React from 'react';
import { BillingInvoice } from '@/types';
import { formatDateDDMMYYYY, formatINR } from '@/lib/billing/gstEngine';
import { DigitalSealBadge } from './DigitalSealBadge';

interface TemplateProps {
  invoice: BillingInvoice;
}

export const ServiceClassicInvoiceTemplate: React.FC<TemplateProps> = ({ invoice }) => {
  const biz = invoice.businessSnapshot;
  const cust = invoice.customer;
  const sym = invoice.currencySymbol || '₹';

  return (
    <div
      className="bg-white text-slate-900 border border-slate-300 relative overflow-hidden flex flex-col justify-between select-text"
      style={{ width: '794px', minHeight: '1122px', boxSizing: 'border-box' }}
    >
      {/* Top Navy Banner */}
      <div>
        <div className="bg-[#0F2942] text-white px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0">
              <img
                src={biz.logoUrl || '/images/chittortech_logo.png'}
                alt={biz.tradeName}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{biz.tradeName}</h1>
              <p className="text-xs text-teal-200 font-medium">{biz.tagline}</p>
              <p className="text-[10.5px] text-slate-300 mt-0.5">{biz.address}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[22px] font-black tracking-widest text-teal-300">
              {invoice.documentType.replace(/_/g, ' ')}
            </p>
            <p className="text-xs font-mono text-white mt-0.5">{invoice.invoiceNumber}</p>
          </div>
        </div>

        {/* Teal Accent Strip */}
        <div className="h-1.5 bg-[#0F9D92]" />

        <div className="p-8 space-y-6">
          {/* Bill To & Dates */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-7 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F9D92] mb-1">
                Billed To
              </p>
              <p className="text-sm font-bold text-[#0F2942]">{cust.name}</p>
              {cust.companyName && <p className="text-xs font-semibold text-slate-700">{cust.companyName}</p>}
              {cust.address && <p className="text-xs text-slate-600 mt-1">{cust.address}</p>}
              <div className="text-[11px] text-slate-600 mt-1.5 space-y-0.5">
                {cust.phone && <p>Phone: {cust.phone}</p>}
                {cust.email && <p>Email: {cust.email}</p>}
                {cust.gstin && <p className="font-mono font-semibold">GSTIN: {cust.gstin}</p>}
              </div>
            </div>

            <div className="col-span-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1.5 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F9D92] mb-1">
                Document Details
              </p>
              <div className="flex justify-between">
                <span className="text-slate-500">Issue Date</span>
                <span className="font-bold">{formatDateDDMMYYYY(invoice.issueDate)}</span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Due Date</span>
                  <span className="font-bold">{formatDateDDMMYYYY(invoice.dueDate)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-[#0F2942]">{invoice.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode</span>
                <span className="font-semibold">{invoice.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Teal Header Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#0F9D92] text-white uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-4">Service / Item Description</th>
                  <th className="py-3 px-3 text-right w-20">Qty</th>
                  <th className="py-3 px-3 text-right w-28">Rate</th>
                  <th className="py-3 px-4 text-right w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-200 ${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.description}</td>
                    <td className="py-3 px-3 text-right font-mono">{item.qty}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatINR(item.rate, sym)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#0F2942]">
                      {formatINR(item.lineTotal, sym)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lower Cards */}
          <div className="grid grid-cols-12 gap-6 items-start">
            <div className="col-span-7 space-y-3">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Amount in Words
                </p>
                <p className="text-xs font-bold text-[#0F2942] mt-1">{invoice.amountInWords}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F9D92] mb-1">
                  Payment Instructions
                </p>
                <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">
                  {invoice.paymentInfo || biz.paymentInstructions}
                </p>
              </div>
              {invoice.terms.length > 0 && (
                <div className="text-[10.5px] text-slate-600">
                  <p className="font-bold text-slate-700 mb-1">Terms &amp; Conditions:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {invoice.terms.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="col-span-5 space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-200 text-xs">
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-mono font-semibold">{formatINR(invoice.subtotal, sym)}</span>
                  </div>
                  {invoice.discountTotal > 0 && (
                    <div className="flex justify-between px-4 py-2 text-teal-700">
                      <span>Discount</span>
                      <span className="font-mono">-{formatINR(invoice.discountTotal, sym)}</span>
                    </div>
                  )}
                  {invoice.taxTotal > 0 && (
                    <div className="flex justify-between px-4 py-2">
                      <span className="text-slate-600">GST</span>
                      <span className="font-mono">{formatINR(invoice.taxTotal, sym)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-3 bg-[#0F2942] text-white text-sm font-extrabold">
                    <span>Grand Total</span>
                    <span className="font-mono">{formatINR(invoice.grandTotal, sym)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end pt-2 space-y-2">
                <DigitalSealBadge seal={invoice.digitalSeal} businessName={biz.tradeName} compact />
                <p className="text-[11px] font-bold text-[#0F2942] pt-2">
                  {biz.authorizedSignatory || `For ${biz.tradeName}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navy Contact Bar */}
      <div className="bg-[#0F2942] text-slate-200 px-8 py-3 flex items-center justify-between text-[10px]">
        <span>{biz.email} • {biz.phone}</span>
        <span>{biz.website || biz.invoiceFooter}</span>
      </div>
    </div>
  );
};

