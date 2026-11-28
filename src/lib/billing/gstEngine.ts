import type {
  CalculatedLineItem,
  DiscountType,
  GstConfig,
  InvoiceLineItemInput,
} from '@/types';

export const STANDARD_GST_RATES = [0, 5, 12, 18, 28] as const;

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Computes Indian Financial Year string (April 1 – March 31), e.g., "2026-27".
 */
export function getIndianFinancialYear(dateInput?: string | Date): string {
  const dt = dateInput ? new Date(dateInput) : new Date();
  const safeDate = Number.isNaN(dt.getTime()) ? new Date() : dt;
  const year = safeDate.getFullYear();
  const month = safeDate.getMonth() + 1; // 1..12
  if (month >= 4) {
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
  }
  return `${year - 1}-${String(year % 100).padStart(2, '0')}`;
}

export function formatINR(amount: number, symbol = '₹'): string {
  const val = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateDDMMYYYY(raw?: string | Date | null): string {
  if (!raw) return '—';
  const str = String(raw).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}-${m}-${y}`;
  }
  const dt = raw instanceof Date ? raw : new Date(str);
  if (Number.isNaN(dt.getTime())) return str;
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}-${m}-${y}`;
}

export function formatLongDateIN(raw?: string | Date | null): string {
  if (!raw) return '—';
  const dt = raw instanceof Date ? raw : new Date(String(raw));
  if (Number.isNaN(dt.getTime())) return String(raw);
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Converts a rupee amount into Indian English words (Crore / Lakh / Thousand / Hundred / Paise).
 */
export function numberToIndianWords(num: number): string {
  if (!Number.isFinite(num) || num <= 0) return 'Zero Rupees Only';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const convertBelowThousand = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += `${ones[Math.floor(n / 100)]} Hundred `;
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += `${ones[n]} `;
      } else {
        str += `${tens[Math.floor(n / 10)]} `;
        if (n % 10 > 0) str += `${ones[n % 10]} `;
      }
    }
    return str;
  };

  const integerPart = Math.floor(num);
  const paisePart = Math.round((num - integerPart) * 100);

  let rem = integerPart;
  let result = '';

  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  if (crore > 0) result += `${convertBelowThousand(crore)}Crore `;

  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  if (lakh > 0) result += `${convertBelowThousand(lakh)}Lakh `;

  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  if (thousand > 0) result += `${convertBelowThousand(thousand)}Thousand `;

  if (rem > 0) result += convertBelowThousand(rem);

  const rupeeText = (result.trim() || 'Zero') + ' Rupees';
  if (paisePart > 0) {
    const paiseText = convertBelowThousand(paisePart).trim();
    return `${rupeeText} and ${paiseText} Paise Only`.replace(/\s+/g, ' ');
  }
  return `${rupeeText} Only`.replace(/\s+/g, ' ');
}

function computeDiscount(base: number, type: DiscountType = 'NONE', value = 0): number {
  if (base <= 0 || !value || value <= 0 || type === 'NONE') return 0;
  if (type === 'PERCENT') {
    const pct = Math.min(100, Math.max(0, value));
    return round2((base * pct) / 100);
  }
  return round2(Math.min(base, value));
}

export interface InvoiceCalculationResult {
  items: CalculatedLineItem[];
  subtotal: number;
  itemDiscountTotal: number;
  invoiceDiscountAmount: number;
  discountTotal: number;
  taxableValue: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
}

/**
 * Centralized deterministic GST & Invoice calculation engine.
 * Used identically on the client preview AND server-side before Firestore persistence.
 */
export function calculateInvoiceTotals(
  rawItems: InvoiceLineItemInput[],
  gstConfig: GstConfig
): InvoiceCalculationResult {
  const baseGstRate =
    gstConfig.taxType === 'EXEMPT' ? 0 : Math.max(0, Math.min(100, Number(gstConfig.gstRate) || 0));

  // Step 1: Compute line-level gross & line discounts
  const preliminary = rawItems.map((item) => {
    const qty = Math.max(0, Number(item.qty) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const grossAmount =
      item.manualAmount !== undefined && item.manualAmount !== null && item.manualAmount >= 0
        ? round2(Number(item.manualAmount))
        : round2(qty * rate);

    const discountAmount = computeDiscount(
      grossAmount,
      item.discountType || 'NONE',
      Number(item.discountValue) || 0
    );
    const netAfterLineDiscount = round2(Math.max(0, grossAmount - discountAmount));

    const itemRate =
      gstConfig.taxType === 'EXEMPT'
        ? 0
        : item.gstRate !== undefined && item.gstRate !== null
        ? Math.max(0, Math.min(100, Number(item.gstRate)))
        : baseGstRate;

    return {
      ...item,
      qty,
      rate,
      grossAmount,
      discountAmount,
      netAfterLineDiscount,
      appliedGstRate: itemRate,
    };
  });

  const subtotal = round2(preliminary.reduce((s, it) => s + it.grossAmount, 0));
  const itemDiscountTotal = round2(preliminary.reduce((s, it) => s + it.discountAmount, 0));
  const netLinesSum = round2(preliminary.reduce((s, it) => s + it.netAfterLineDiscount, 0));

  // Step 2: Invoice-level discount distributed proportionally so per-line GST remains accurate
  const invoiceDiscountAmount = computeDiscount(
    netLinesSum,
    gstConfig.invoiceDiscountType || 'NONE',
    Number(gstConfig.invoiceDiscountValue) || 0
  );

  let remainingInvDiscount = invoiceDiscountAmount;
  const calculatedItems: CalculatedLineItem[] = preliminary.map((it, idx) => {
    let lineInvDiscountShare = 0;
    if (invoiceDiscountAmount > 0 && netLinesSum > 0) {
      if (idx === preliminary.length - 1) {
        lineInvDiscountShare = round2(remainingInvDiscount);
      } else {
        lineInvDiscountShare = round2((it.netAfterLineDiscount / netLinesSum) * invoiceDiscountAmount);
        remainingInvDiscount = round2(remainingInvDiscount - lineInvDiscountShare);
      }
    }

    const taxableAmount = round2(Math.max(0, it.netAfterLineDiscount - lineInvDiscountShare));

    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (gstConfig.taxType === 'CGST_SGST' && it.appliedGstRate > 0) {
      cgstRate = round2(it.appliedGstRate / 2);
      sgstRate = round2(it.appliedGstRate / 2);
      cgstAmount = round2((taxableAmount * cgstRate) / 100);
      sgstAmount = round2((taxableAmount * sgstRate) / 100);
    } else if (gstConfig.taxType === 'IGST' && it.appliedGstRate > 0) {
      igstRate = it.appliedGstRate;
      igstAmount = round2((taxableAmount * igstRate) / 100);
    }

    const taxAmount = round2(cgstAmount + sgstAmount + igstAmount);
    const lineTotal = round2(taxableAmount + taxAmount);

    return {
      ...it,
      taxableAmount,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      taxAmount,
      lineTotal,
    };
  });

  const taxableValue = round2(calculatedItems.reduce((s, it) => s + it.taxableAmount, 0));
  const cgstTotal = round2(calculatedItems.reduce((s, it) => s + it.cgstAmount, 0));
  const sgstTotal = round2(calculatedItems.reduce((s, it) => s + it.sgstAmount, 0));
  const igstTotal = round2(calculatedItems.reduce((s, it) => s + it.igstAmount, 0));
  const taxTotal = round2(cgstTotal + sgstTotal + igstTotal);
  const discountTotal = round2(itemDiscountTotal + invoiceDiscountAmount);

  const rawGrandTotal = round2(taxableValue + taxTotal);
  const grandTotal = gstConfig.enableRoundOff ? Math.round(rawGrandTotal) : rawGrandTotal;
  const roundOff = gstConfig.enableRoundOff ? round2(grandTotal - rawGrandTotal) : 0;

  return {
    items: calculatedItems,
    subtotal,
    itemDiscountTotal,
    invoiceDiscountAmount,
    discountTotal,
    taxableValue,
    cgstTotal,
    sgstTotal,
    igstTotal,
    taxTotal,
    roundOff,
    grandTotal,
    amountInWords: numberToIndianWords(grandTotal),
  };
}
