import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateInvoiceTotals,
  getIndianFinancialYear,
  numberToIndianWords,
} from '../src/lib/billing/gstEngine.ts';

test('CGST + SGST calculation computes 9% + 9% accurately', () => {
  const res = calculateInvoiceTotals(
    [{ id: '1', description: 'Cloud Infrastructure Setup', qty: 2, rate: 5000 }],
    {
      taxType: 'CGST_SGST',
      gstRate: 18,
      placeOfSupply: 'Rajasthan',
      reverseCharge: false,
      primarySac: '998314',
      documentBadge: 'ORIGINAL FOR RECIPIENT',
      serviceSummaryNote: '',
      enableRoundOff: false,
      invoiceDiscountType: 'NONE',
      invoiceDiscountValue: 0,
    }
  );

  assert.equal(res.subtotal, 10000);
  assert.equal(res.taxableValue, 10000);
  assert.equal(res.cgstTotal, 900);
  assert.equal(res.sgstTotal, 900);
  assert.equal(res.igstTotal, 0);
  assert.equal(res.taxTotal, 1800);
  assert.equal(res.grandTotal, 11800);
});

test('IGST + invoice discount + roundOff computes accurately', () => {
  const res = calculateInvoiceTotals(
    [{ id: '1', description: 'Enterprise SaaS License', qty: 1, rate: 999 }],
    {
      taxType: 'IGST',
      gstRate: 18,
      placeOfSupply: 'Maharashtra',
      reverseCharge: false,
      primarySac: '998314',
      documentBadge: 'ORIGINAL FOR RECIPIENT',
      serviceSummaryNote: '',
      enableRoundOff: true,
      invoiceDiscountType: 'PERCENT',
      invoiceDiscountValue: 10,
    }
  );

  // 999 - 99.90 = 899.10 taxable; 18% IGST = 161.84; total = 1060.94 -> roundOff +0.06 -> 1061
  assert.equal(res.subtotal, 999);
  assert.equal(res.taxableValue, 899.1);
  assert.equal(res.igstTotal, 161.84);
  assert.equal(res.grandTotal, 1061);
  assert.equal(res.roundOff, 0.06);
});

test('Mewari manual amount override respects explicit weight pricing cleanly', () => {
  const res = calculateInvoiceTotals(
    [
      {
        id: '1',
        description: 'Specialty HR Logistics Consignment',
        weight: '42.5 kg',
        qty: 1,
        rate: 120,
        manualAmount: 5000,
      },
    ],
    {
      taxType: 'EXEMPT',
      gstRate: 0,
      placeOfSupply: 'Rajasthan',
      reverseCharge: false,
      primarySac: '',
      documentBadge: 'ORIGINAL FOR RECIPIENT',
      serviceSummaryNote: '',
      enableRoundOff: false,
      invoiceDiscountType: 'NONE',
      invoiceDiscountValue: 0,
    }
  );

  assert.equal(res.subtotal, 5000);
  assert.equal(res.taxTotal, 0);
  assert.equal(res.grandTotal, 5000);
});

test('numberToIndianWords formats Indian numbering system with Lakhs and Paise', () => {
  assert.equal(
    numberToIndianWords(125430.5),
    'One Lakh Twenty Five Thousand Four Hundred Thirty Rupees and Fifty Paise Only'
  );
  assert.equal(numberToIndianWords(0), 'Zero Rupees Only');
});

test('getIndianFinancialYear resolves April-March Indian FY correctly', () => {
  assert.equal(getIndianFinancialYear('2026-04-01'), '2026-27');
  assert.equal(getIndianFinancialYear('2026-03-31'), '2025-26');
});
