'use client';

import React from 'react';
import { BillingInvoice } from '@/types';
import { formatDateDDMMYYYY, formatINR } from '@/lib/billing/gstEngine';
import { DigitalSealBadge } from './DigitalSealBadge';

interface TemplateProps {
  invoice: BillingInvoice;
}

/**
 * Replicates legacy mewari.html + mewari_script.js specialized layout
 * featuring Weight + Rate + Manual Amount Override column and Seal.
 */
export const MewariInvoiceTemplate: React.FC<TemplateProps> = ({ invoice }) => {
  const biz = invoice.businessSnapshot;
  const cust = invoice.customer;
  const sym = invoice.currencySymbol || '₹';

  return (
    <div
      className="bg-white text-slate-900 border border-slate-300 flex flex-col justify-between select-text"
      style={{ width: '794px', minHeight: '1122px', boxSizing: 'border-box' }}
    >
      <div>
        {/* Mewari Header */}
        <div className="bg-gradient-to-r from-[#0F2942] to-[#0D5C63] text-white px-8 py-6 flex items-center justify-between">
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
              <p className="text-xs text-amber-200 font-medium">{biz.tagline}</p>
              <p className="text-[10.5px] text-slate-200 mt-0.5">{biz.address}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">
              {invoice.documentType.replace(/_/g, ' ')}
            </p>
            <p className="text-lg font-mono font-extrabold mt-0.5">{invoice.invoiceNumber}</p>
            <p className="text-[11px] text-slate-200">Date: {formatDateDDMMYYYY(invoice.issueDate)}</p>
          </div>
        </div>

        <div className="p-8 space-y-5">
          {/* Recipient & Entity Block */}
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-7 rounded-xl border border-slate-200 p-4 bg-slate-50/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0D5C63] mb-1">
                Bill To / Customer
              </p>
              <p className="text-sm font-bold text-slate-900">{cust.name}</p>
              {cust.companyName && <p className="text-xs text-slate-700">{cust.companyName}</p>}
              {cust.address && <p className="text-xs text-slate-600 mt-1">{cust.address}</p>}
              <p className="text-[11px] text-slate-600 mt-1">
                {cust.phone && `Ph: ${cust.phone} `}
                {cust.gstin && `• GSTIN: ${cust.gstin}`}
              </p>
            </div>
            <div className="col-span-5 rounded-xl border border-slate-200 p-4 bg-slate-50/60 text-xs space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0D5C63] mb-1">
                Billing Reference
              </p>
              <div className="flex justify-between">
                <span className="text-slate-500">Financial Year</span>
                <span className="font-mono font-bold">{invoice.financialYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Settlement Mode</span>
                <span className="font-semibold">{invoice.paymentMethod}</span>
              </div>
              {biz.parentBusinessName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Group Parent</span>
                  <span className="font-semibold">{biz.parentBusinessName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mewari Items Table with Weight column */}
          <div className="overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#0F2942] text-white text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-4">Item / Particulars</th>
                  <th className="py-2.5 px-3 text-center w-24">Weight</th>
                  <th className="py-2.5 px-3 text-right w-16">Qty</th>
                  <th className="py-2.5 px-3 text-right w-24">Rate</th>
                  <th className="py-2.5 px-4 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-200 ${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{item.description}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {item.weight || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{item.qty}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatINR(item.rate, sym)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0F2942]">
                      {formatINR(item.lineTotal, sym)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary & Digital Seal */}
          <div className="grid grid-cols-12 gap-6 items-start">
            <div className="col-span-7 space-y-3">
              <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
                <p className="text-[10px] font-bold uppercase text-slate-500">Amount in Words</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{invoice.amountInWords}</p>
              </div>
              {invoice.paymentInfo && (
                <div className="rounded-xl border border-slate-200 p-3.5 text-[11px] text-slate-600 whitespace-pre-line">
                  <p className="text-[10px] font-bold uppercase text-[#0D5C63] mb-1">
                    Bank / UPI Settlement
                  </p>
                  {invoice.paymentInfo}
                </div>
              )}
            </div>

            <div className="col-span-5 space-y-3">
              <div className="rounded-xl border border-slate-300 overflow-hidden text-xs divide-y divide-slate-200">
                <div className="flex justify-between px-4 py-2">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-mono font-semibold">{formatINR(invoice.subtotal, sym)}</span>
                </div>
                {invoice.taxTotal > 0 && (
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-slate-600">GST</span>
                    <span className="font-mono font-semibold">{formatINR(invoice.taxTotal, sym)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 bg-[#0F2942] text-white text-sm font-extrabold">
                  <span>Grand Total</span>
                  <span className="font-mono">{formatINR(invoice.grandTotal, sym)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end pt-1">
                <DigitalSealBadge seal={invoice.digitalSeal} businessName={biz.tradeName} compact />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-100 border-t border-slate-200 px-8 py-3 flex justify-between text-[10px] text-slate-600">
        <span>{biz.legalName} • {biz.phone}</span>
        <span>{biz.invoiceFooter}</span>
      </div>
    </div>
  );
};

