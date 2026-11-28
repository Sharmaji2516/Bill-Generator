'use client';

import React from 'react';
import { BillingInvoice } from '@/types';
import { formatDateDDMMYYYY, formatINR } from '@/lib/billing/gstEngine';
import { DigitalSealBadge } from './DigitalSealBadge';

interface TemplateProps {
  invoice: BillingInvoice;
}

const DOC_TITLE_MAP: Record<string, string> = {
  TAX_INVOICE: 'TAX INVOICE',
  SERVICE_INVOICE: 'TAX INVOICE',
  QUOTATION: 'GST QUOTATION',
  PROFORMA_INVOICE: 'PROFORMA INVOICE',
  PAYMENT_RECEIPT: 'PAYMENT RECEIPT',
  CREDIT_NOTE: 'CREDIT NOTE',
  DEBIT_NOTE: 'DEBIT NOTE',
};

export const GstTaxInvoiceTemplate: React.FC<TemplateProps> = ({ invoice }) => {
  const biz = invoice.businessSnapshot;
  const cust = invoice.customer;
  const gst = invoice.gstConfig;
  const sym = invoice.currencySymbol || '₹';

  const isCompact = invoice.items.length >= 6 || invoice.terms.length >= 4;
  const isDense = invoice.items.length >= 10;

  const isCgstSgst = gst.taxType === 'CGST_SGST';
  const isIgst = gst.taxType === 'IGST';

  return (
    <div
      className={`bg-white text-slate-900 border border-slate-300 relative overflow-hidden select-text ${
        isDense ? 'p-5 text-[10px]' : isCompact ? 'p-6 text-[10.5px]' : 'p-8 text-[11.5px]'
      }`}
      style={{ width: '794px', minHeight: '1122px', boxSizing: 'border-box' }}
    >
      {/* Top Subtle Watermark */}
      {biz.logoUrl && (
        <img
          src={biz.logoUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] opacity-[0.045] grayscale"
        />
      )}

      {/* Header Band */}
      <div className="relative z-10 flex items-start justify-between gap-4 pb-4 border-b-2 border-[#0F2942]">
        <div className="flex items-start gap-3.5 max-w-[60%]">
          <div className="h-14 w-14 rounded-lg border border-slate-200 bg-white p-1.5 flex items-center justify-center shrink-0">
            <img
              src={biz.logoUrl || '/images/chittortech_logo.png'}
              alt={biz.tradeName}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-[19px] font-extrabold tracking-tight text-[#0F2942] leading-tight">
              {biz.legalName || biz.tradeName}
            </h1>
            {biz.tagline && (
              <p className="text-[10.5px] font-semibold text-teal-700">{biz.tagline}</p>
            )}
            <p className="text-[10px] text-slate-600 leading-snug">{biz.address}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-700 pt-0.5 font-medium">
              {biz.gstin && (
                <span>
                  <strong className="text-[#0F2942]">GSTIN:</strong>{' '}
                  <span className="font-mono font-bold">{biz.gstin}</span>
                </span>
              )}
              {biz.pan && (
                <span>
                  <strong className="text-[#0F2942]">PAN:</strong>{' '}
                  <span className="font-mono">{biz.pan}</span>
                </span>
              )}
              {biz.udyamRegNo && (
                <span>
                  <strong className="text-[#0F2942]">Udyam:</strong> {biz.udyamRegNo}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-600">
              {biz.phone && <span>Ph: {biz.phone}</span>}
              {biz.email && <span> • {biz.email}</span>}
              {biz.website && <span> • {biz.website}</span>}
            </p>
          </div>
        </div>

        <div className="text-right space-y-1.5 shrink-0">
          <div className="inline-block rounded bg-[#0F2942] text-white px-3 py-1 text-[13px] font-extrabold tracking-wider">
            {DOC_TITLE_MAP[invoice.documentType] || 'TAX INVOICE'}
          </div>
          <p className="text-[9.5px] font-bold uppercase tracking-widest text-teal-700">
            {gst.documentBadge || 'ORIGINAL FOR RECIPIENT'}
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[10.5px] space-y-0.5 min-w-[215px]">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Invoice No:</span>
              <span className="font-mono font-extrabold text-[#0F2942]">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Issue Date:</span>
              <span className="font-semibold">{formatDateDDMMYYYY(invoice.issueDate)}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-semibold">{formatDateDDMMYYYY(invoice.dueDate)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Financial Year:</span>
              <span className="font-mono font-semibold">{invoice.financialYear}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recipient & Compliance Grid */}
      <div className="relative z-10 grid grid-cols-12 gap-3 my-3.5">
        <div className="col-span-7 rounded-lg border border-slate-300 p-3 bg-slate-50/40">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-teal-700 mb-1">
            Details of Receiver (Billed To)
          </p>
          <p className="text-[13px] font-bold text-[#0F2942] leading-tight">
            {cust.name || 'Walk-in / Client'}
          </p>
          {cust.companyName && (
            <p className="text-[11px] font-semibold text-slate-700">{cust.companyName}</p>
          )}
          {cust.address && (
            <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{cust.address}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-700 mt-1.5">
            <span>
              <strong>GSTIN:</strong>{' '}
              <span className="font-mono font-semibold">{cust.gstin || 'Unregistered / B2C'}</span>
            </span>
            {cust.phone && (
              <span>
                <strong>Ph:</strong> {cust.phone}
              </span>
            )}
            {cust.email && (
              <span>
                <strong>Email:</strong> {cust.email}
              </span>
            )}
          </div>
        </div>

        <div className="col-span-5 rounded-lg border border-slate-300 p-3 bg-slate-50/40 space-y-1 text-[10.5px]">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-teal-700 mb-1">
            GST &amp; Supply Metadata
          </p>
          <div className="flex justify-between">
            <span className="text-slate-500">Place of Supply:</span>
            <span className="font-bold text-slate-800">
              {gst.placeOfSupply || biz.state}
              {gst.placeOfSupplyCode ? ` (${gst.placeOfSupplyCode})` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Primary HSN / SAC:</span>
            <span className="font-mono font-bold text-slate-800">{gst.primarySac || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tax Regime:</span>
            <span className="font-bold text-[#0F2942]">
              {isCgstSgst
                ? 'Intra-State (CGST + SGST)'
                : isIgst
                ? 'Inter-State (IGST)'
                : 'Exempt / Nil-Rated'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Reverse Charge:</span>
            <span className="font-semibold">{gst.reverseCharge ? 'Yes (RCM Applicable)' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* GST Line Items Table */}
      <div className="relative z-10 overflow-hidden rounded-lg border border-[#0F2942]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#0F2942] text-white text-[9.5px] uppercase tracking-wider">
              <th className="py-2 px-2 border-r border-slate-600 text-center w-8">#</th>
              <th className="py-2 px-2.5 border-r border-slate-600">Description of Goods / Services</th>
              <th className="py-2 px-2 border-r border-slate-600 text-center w-16">HSN/SAC</th>
              <th className="py-2 px-2 border-r border-slate-600 text-right w-14">Qty</th>
              <th className="py-2 px-2 border-r border-slate-600 text-right w-20">Rate</th>
              <th className="py-2 px-2 border-r border-slate-600 text-right w-20">Taxable</th>
              {isCgstSgst && (
                <>
                  <th className="py-2 px-2 border-r border-slate-600 text-right w-20">CGST</th>
                  <th className="py-2 px-2 border-r border-slate-600 text-right w-20">SGST</th>
                </>
              )}
              {isIgst && (
                <th className="py-2 px-2 border-r border-slate-600 text-right w-24">IGST</th>
              )}
              <th className="py-2 px-2.5 text-right w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr
                key={item.id}
                className={`border-b border-slate-200 ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
              >
                <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-slate-600">
                  {idx + 1}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-200 font-medium text-slate-900">
                  {item.description}
                  {item.discountAmount > 0 && (
                    <span className="block text-[9px] text-teal-700">
                      Discount applied: -{formatINR(item.discountAmount, sym)}
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-slate-700">
                  {item.hsnSac || gst.primarySac || '—'}
                </td>
                <td className="py-2 px-2 border-r border-slate-200 text-right font-mono">
                  {item.qty} {item.unit || ''}
                </td>
                <td className="py-2 px-2 border-r border-slate-200 text-right font-mono">
                  {formatINR(item.rate, sym)}
                </td>
                <td className="py-2 px-2 border-r border-slate-200 text-right font-mono">
                  {formatINR(item.taxableAmount, sym)}
                </td>
                {isCgstSgst && (
                  <>
                    <td className="py-2 px-2 border-r border-slate-200 text-right font-mono">
                      <div>{formatINR(item.cgstAmount, sym)}</div>
                      <div className="text-[8.5px] text-slate-500">({item.cgstRate}%)</div>
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right font-mono">
                      <div>{formatINR(item.sgstAmount, sym)}</div>
                      <div className="text-[8.5px] text-slate-500">({item.sgstRate}%)</div>
                    </td>
                  </>
                )}
                {isIgst && (
                  <td className="py-2 px-2 border-r border-slate-200 text-right font-mono">
                    <div>{formatINR(item.igstAmount, sym)}</div>
                    <div className="text-[8.5px] text-slate-500">({item.igstRate}%)</div>
                  </td>
                )}
                <td className="py-2 px-2.5 text-right font-mono font-bold text-[#0F2942]">
                  {formatINR(item.lineTotal, sym)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Amount in Words + Tax Totals Block */}
      <div className="relative z-10 grid grid-cols-12 gap-4 mt-3.5">
        <div className="col-span-7 space-y-2.5">
          <div className="rounded-lg border border-slate-300 bg-slate-50/60 p-3">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
              Total Invoice Value in Words
            </p>
            <p className="text-[11px] font-bold text-[#0F2942] mt-0.5 leading-snug">
              {invoice.amountInWords}
            </p>
          </div>

          <div className="rounded-lg border border-slate-300 p-3 space-y-1">
            <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-teal-700">
              Bank &amp; Settlement Details ({invoice.paymentMethod})
            </p>
            <p className="text-[10px] text-slate-700 whitespace-pre-line leading-relaxed">
              {invoice.paymentInfo ||
                `Bank: ${biz.bankName || '—'}\nA/C Name: ${biz.accountName || biz.legalName}\nA/C No: ${biz.accountNumber || '—'} | IFSC: ${biz.ifscCode || '—'}${biz.upiId ? `\nUPI ID: ${biz.upiId}` : ''}`}
            </p>
          </div>
        </div>

        <div className="col-span-5 rounded-lg border border-slate-300 overflow-hidden bg-white self-start">
          <div className="divide-y divide-slate-200 text-[10.5px]">
            <div className="flex justify-between px-3 py-1.5">
              <span className="text-slate-600">Subtotal (Gross)</span>
              <span className="font-mono font-semibold">{formatINR(invoice.subtotal, sym)}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between px-3 py-1.5 text-teal-700">
                <span>Total Discount</span>
                <span className="font-mono font-semibold">-{formatINR(invoice.discountTotal, sym)}</span>
              </div>
            )}
            <div className="flex justify-between px-3 py-1.5 bg-slate-50">
              <span className="font-semibold text-slate-700">Taxable Value</span>
              <span className="font-mono font-bold">{formatINR(invoice.taxableValue, sym)}</span>
            </div>
            {isCgstSgst && (
              <>
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-slate-600">CGST ({gst.gstRate / 2}%)</span>
                  <span className="font-mono">{formatINR(invoice.cgstTotal, sym)}</span>
                </div>
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-slate-600">SGST ({gst.gstRate / 2}%)</span>
                  <span className="font-mono">{formatINR(invoice.sgstTotal, sym)}</span>
                </div>
              </>
            )}
            {isIgst && (
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">IGST ({gst.gstRate}%)</span>
                <span className="font-mono">{formatINR(invoice.igstTotal, sym)}</span>
              </div>
            )}
            {invoice.roundOff !== 0 && (
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">Round Off</span>
                <span className="font-mono">
                  {invoice.roundOff > 0 ? '+' : ''}
                  {invoice.roundOff.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between px-3 py-2.5 bg-[#0F2942] text-white text-[13px] font-extrabold">
              <span>Grand Total</span>
              <span className="font-mono">{formatINR(invoice.grandTotal, sym)}</span>
            </div>
            {(invoice.amountPaid > 0 || invoice.balanceDue > 0) && (
              <div className="flex justify-between px-3 py-1.5 bg-slate-50 text-[10px]">
                <span className="text-slate-600">
                  Paid: <strong className="font-mono">{formatINR(invoice.amountPaid, sym)}</strong>
                </span>
                <span className="text-[#0F2942]">
                  Balance Due: <strong className="font-mono">{formatINR(invoice.balanceDue, sym)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terms + Notes + Authorized Seal */}
      <div className="relative z-10 grid grid-cols-12 gap-4 mt-4 pt-3 border-t border-slate-300 items-end">
        <div className="col-span-7 space-y-1.5">
          {invoice.notes && (
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Notes</p>
              <p className="text-[10px] text-slate-700 leading-snug">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms.length > 0 && (
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                Terms &amp; Conditions
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[9.5px] text-slate-600">
                {invoice.terms.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="col-span-5 text-right flex flex-col items-end space-y-2">
          <DigitalSealBadge seal={invoice.digitalSeal} businessName={biz.tradeName} compact />
          <div className="pt-2">
            <p className="text-[10px] font-bold text-[#0F2942]">
              For {biz.legalName || biz.tradeName}
            </p>
            <p className="text-[9.5px] text-slate-500 mt-3 border-t border-slate-400 pt-1 inline-block min-w-[160px]">
              {biz.authorizedSignatory || 'Authorized Signatory'}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-5 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
        <span>{biz.invoiceFooter || `${biz.tradeName} • Subject to Chittorgarh Jurisdiction`}</span>
        <span>Computer-generated GST Document</span>
      </div>
    </div>
  );
};

