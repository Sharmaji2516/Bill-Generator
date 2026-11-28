import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BillingInvoice, BusinessProfile } from '@/types';
import { formatDateDDMMYYYY, formatINR } from './gstEngine';

/**
 * Generates an enterprise crisp A4 PDF directly from the live DOM invoice container
 * using html2canvas at high DPI, automatically handling single or multi-page A4 flow.
 */
export async function exportInvoiceElementToPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2.2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#FFFFFF',
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight + 2) {
    // Fit comfortably on single A4 page
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight), undefined, 'FAST');
  } else {
    // Multi-page A4 slice
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 1) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  pdf.save(safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`);
}

export interface ReportExportRow {
  invoiceNumber: string;
  issueDate: string;
  businessName: string;
  documentType: string;
  customerName: string;
  customerGstin: string;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGst: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
}

export function buildReportRows(
  invoices: BillingInvoice[],
  businesses: Record<string, BusinessProfile>
): ReportExportRow[] {
  return invoices.map((inv) => {
    const biz = businesses[inv.businessId];
    return {
      invoiceNumber: inv.invoiceNumber,
      issueDate: formatDateDDMMYYYY(inv.issueDate),
      businessName: biz?.tradeName || inv.businessId,
      documentType: inv.documentType.replace(/_/g, ' '),
      customerName: inv.customer.companyName
        ? `${inv.customer.name} (${inv.customer.companyName})`
        : inv.customer.name,
      customerGstin: inv.customer.gstin || 'URD / Unregistered',
      taxableValue: inv.taxableValue,
      cgstAmount: inv.cgstTotal,
      sgstAmount: inv.sgstTotal,
      igstAmount: inv.igstTotal,
      totalGst: inv.taxTotal,
      grandTotal: inv.grandTotal,
      amountPaid: inv.amountPaid,
      balanceDue: inv.balanceDue,
      status: inv.status,
    };
  });
}

export function exportReportToCsv(rows: ReportExportRow[], fileName: string): void {
  const headers = [
    'Document No',
    'Issue Date',
    'Business Entity',
    'Document Type',
    'Customer Name',
    'Customer GSTIN',
    'Taxable Value (INR)',
    'CGST (INR)',
    'SGST (INR)',
    'IGST (INR)',
    'Total GST (INR)',
    'Grand Total (INR)',
    'Paid (INR)',
    'Balance Due (INR)',
    'Status',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.invoiceNumber,
        r.issueDate,
        r.businessName,
        r.documentType,
        r.customerName,
        r.customerGstin,
        r.taxableValue.toFixed(2),
        r.cgstAmount.toFixed(2),
        r.sgstAmount.toFixed(2),
        r.igstAmount.toFixed(2),
        r.totalGst.toFixed(2),
        r.grandTotal.toFixed(2),
        r.amountPaid.toFixed(2),
        r.balanceDue.toFixed(2),
        r.status,
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportToExcel(
  rows: ReportExportRow[],
  reportTitle: string,
  fileName: string
): void {
  const worksheetData = rows.map((r) => ({
    'Document No': r.invoiceNumber,
    'Issue Date': r.issueDate,
    'Business Entity': r.businessName,
    'Document Type': r.documentType,
    'Customer Name': r.customerName,
    'Customer GSTIN': r.customerGstin,
    'Taxable Value': r.taxableValue,
    CGST: r.cgstAmount,
    SGST: r.sgstAmount,
    IGST: r.igstAmount,
    'Total GST': r.totalGst,
    'Grand Total': r.grandTotal,
    'Amount Paid': r.amountPaid,
    'Balance Due': r.balanceDue,
    Status: r.status,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(worksheetData);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 20 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, reportTitle.slice(0, 31) || 'Billing Report');
  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

export function exportReportToSummaryPdf(
  rows: ReportExportRow[],
  title: string,
  subtitle: string,
  fileName: string
): void {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 297, 24, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.text(title, 14, 11);
  pdf.setFontSize(9);
  pdf.setTextColor(203, 213, 225);
  pdf.text(subtitle, 14, 18);

  const totals = rows.reduce(
    (acc, r) => {
      acc.taxable += r.taxableValue;
      acc.gst += r.totalGst;
      acc.grand += r.grandTotal;
      acc.paid += r.amountPaid;
      acc.due += r.balanceDue;
      return acc;
    },
    { taxable: 0, gst: 0, grand: 0, paid: 0, due: 0 }
  );

  autoTable(pdf, {
    startY: 30,
    head: [
      [
        'Doc No',
        'Date',
        'Entity',
        'Customer',
        'GSTIN',
        'Taxable',
        'CGST',
        'SGST',
        'IGST',
        'Grand Total',
        'Paid',
        'Due',
        'Status',
      ],
    ],
    body: rows.map((r) => [
      r.invoiceNumber,
      r.issueDate,
      r.businessName,
      r.customerName,
      r.customerGstin,
      r.taxableValue.toFixed(2),
      r.cgstAmount.toFixed(2),
      r.sgstAmount.toFixed(2),
      r.igstAmount.toFixed(2),
      r.grandTotal.toFixed(2),
      r.amountPaid.toFixed(2),
      r.balanceDue.toFixed(2),
      r.status,
    ]),
    foot: [
      [
        'TOTAL',
        `${rows.length} docs`,
        '',
        '',
        '',
        formatINR(totals.taxable, 'INR '),
        '',
        '',
        formatINR(totals.gst, 'INR '),
        formatINR(totals.grand, 'INR '),
        formatINR(totals.paid, 'INR '),
        formatINR(totals.due, 'INR '),
        '',
      ],
    ],
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [234, 243, 255], textColor: [30, 41, 59], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
