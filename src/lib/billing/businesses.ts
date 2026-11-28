import { BusinessId, BusinessProfile, BillingDocumentType } from '@/types';

/**
 * Canonical default business profiles for the ChittorTech multi-business hierarchy.
 * Parent Company: ChittorTech
 * Subsidiaries: Mewari Achaar, Visit Chittorgarh
 *
 * Registration/banking details that are not yet verified for subsidiaries are
 * intentionally left blank (pending configuration) and never invented.
 */
export const DEFAULT_BUSINESS_PROFILES: Record<string, BusinessProfile> = {
  chittortech: {
    id: 'chittortech',
    docType: 'business',
    tradeName: 'ChittorTech',
    legalName: 'KUSH SHARMA (ChittorTech)',
    tagline: 'IT SERVICES • SOFTWARE • DIGITAL SOLUTIONS',
    isParent: true,
    parentBusinessId: null,
    parentBusinessName: null,
    logoUrl: '/images/chittortech_logo.png',
    address: 'Chittorgarh, Rajasthan – 312001, India',
    state: 'Rajasthan',
    stateCode: '08',
    gstin: '08OTWPS1188A1ZV',
    pan: 'OTWPS1188A',
    udyamRegNo: '',
    email: 'business@chittortech.in',
    phone: '+91 7597451057',
    website: 'chittortech.in',
    bankName: 'Chittorgarh Urban Co-operative Bank',
    accountName: 'ChittorTech',
    accountNumber: '',
    ifscCode: '',
    upiId: '8233816674@upi',
    invoicePrefix: 'CT',
    quotationPrefix: 'CT-QT',
    proformaPrefix: 'CT-PI',
    receiptPrefix: 'CT-RCP',
    creditNotePrefix: 'CT-CN',
    debitNotePrefix: 'CT-DN',
    defaultTemplate: 'gst_tax',
    defaultGstRate: 18,
    gstRegistered: true,
    defaultCurrency: '₹',
    authorizedSignatory: 'Authorized Signatory — ChittorTech',
    paymentInstructions:
      'Account Name: ChittorTech\nBank Name: Chittorgarh Urban Co-operative Bank\nUPI ID: 8233816674@upi (Display Name: Kush Sharma)',
    defaultTerms: [
      'Payment is due upon receipt of this invoice.',
      'Work milestone deliverables will be released upon payment clearance.',
      'All payments must be remitted only to official ChittorTech accounts.',
      'Subject to Chittorgarh, Rajasthan jurisdiction.',
    ],
    invoiceFooter: 'ChittorTech • Chittorgarh, Rajasthan • chittortech.in',
    complianceNote:
      'Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged.',
    accentColor: '#2563EB',
  },
  mewari_achaar: {
    id: 'mewari_achaar',
    docType: 'business',
    tradeName: 'Mewari Achaar',
    legalName: 'Mewari Achaar',
    tagline: 'ARTISANAL PICKLES • AUTHENTIC MEWARI FLAVORS • FOOD PRODUCTS',
    isParent: false,
    parentBusinessId: 'chittortech',
    parentBusinessName: 'ChittorTech',
    logoUrl: '/images/chittortech_logo.png',
    address: '',
    state: 'Rajasthan',
    stateCode: '08',
    gstin: '',
    pan: '',
    udyamRegNo: '',
    email: '',
    phone: '',
    website: '',
    bankName: '',
    accountName: 'Mewari Achaar',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    invoicePrefix: 'MA',
    quotationPrefix: 'MA-QT',
    proformaPrefix: 'MA-PI',
    receiptPrefix: 'MA-RCP',
    creditNotePrefix: 'MA-CN',
    debitNotePrefix: 'MA-DN',
    defaultTemplate: 'mewari',
    defaultGstRate: 5,
    gstRegistered: false,
    defaultCurrency: '₹',
    authorizedSignatory: 'Authorized Signatory — Mewari Achaar',
    paymentInstructions: '',
    defaultTerms: [
      'Payment is due upon delivery / agreed billing cycle.',
      'Please quote invoice number with remittance reference.',
      'Subject to Chittorgarh, Rajasthan jurisdiction.',
    ],
    invoiceFooter: 'Mewari Achaar • Subsidiary of ChittorTech',
    complianceNote:
      'Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged.',
    accentColor: '#0F9D92',
  },
  visit_chittorgarh: {
    id: 'visit_chittorgarh',
    docType: 'business',
    tradeName: 'Visit Chittorgarh',
    legalName: 'Visit Chittorgarh',
    tagline: 'HERITAGE TOURISM • HOSPITALITY • CHITTORGARH EXPERIENCES',
    isParent: false,
    parentBusinessId: 'chittortech',
    parentBusinessName: 'ChittorTech',
    logoUrl: '/images/chittortech_logo.png',
    address: '',
    state: 'Rajasthan',
    stateCode: '08',
    gstin: '',
    pan: '',
    udyamRegNo: '',
    email: '',
    phone: '',
    website: '',
    bankName: '',
    accountName: 'Visit Chittorgarh',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    invoicePrefix: 'VC',
    quotationPrefix: 'VC-QT',
    proformaPrefix: 'VC-PI',
    receiptPrefix: 'VC-RCP',
    creditNotePrefix: 'VC-CN',
    debitNotePrefix: 'VC-DN',
    defaultTemplate: 'service_classic',
    defaultGstRate: 18,
    gstRegistered: false,
    defaultCurrency: '₹',
    authorizedSignatory: 'Authorized Signatory — Visit Chittorgarh',
    paymentInstructions: '',
    defaultTerms: [
      'Payment is due upon receipt of this document.',
      'Please quote invoice number during bank/UPI transfer.',
      'Subject to Chittorgarh, Rajasthan jurisdiction.',
    ],
    invoiceFooter: 'Visit Chittorgarh • Subsidiary of ChittorTech',
    complianceNote:
      'Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged.',
    accentColor: '#4F46E5',
  },
};

export const BUSINESS_ORDER: BusinessId[] = ['chittortech', 'mewari_achaar', 'visit_chittorgarh'];

export function getDocumentPrefix(business: BusinessProfile, docType: BillingDocumentType): string {
  switch (docType) {
    case 'QUOTATION':
      return business.quotationPrefix || `${business.invoicePrefix}-QT`;
    case 'PROFORMA_INVOICE':
      return business.proformaPrefix || `${business.invoicePrefix}-PI`;
    case 'PAYMENT_RECEIPT':
      return business.receiptPrefix || `${business.invoicePrefix}-RCP`;
    case 'CREDIT_NOTE':
      return business.creditNotePrefix || `${business.invoicePrefix}-CN`;
    case 'DEBIT_NOTE':
      return business.debitNotePrefix || `${business.invoicePrefix}-DN`;
    case 'TAX_INVOICE':
    case 'SERVICE_INVOICE':
    default:
      return business.invoicePrefix || 'CT';
  }
}

export function getPendingBusinessFields(business: BusinessProfile): string[] {
  const pending: string[] = [];
  if (!business.address?.trim()) pending.push('Business Address');
  if (!business.gstin?.trim()) pending.push('GSTIN');
  if (!business.pan?.trim()) pending.push('PAN');
  if (!business.email?.trim()) pending.push('Email');
  if (!business.phone?.trim()) pending.push('Phone');
  if (!business.bankName?.trim() || !business.accountNumber?.trim() || !business.ifscCode?.trim()) {
    pending.push('Bank Account / IFSC');
  }
  return pending;
}

export const INDIAN_STATES: { name: string; code: string }[] = [
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Delhi', code: '07' },
  { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Jammu & Kashmir', code: '01' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' },
  { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'West Bengal', code: '19' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Puducherry', code: '34' },
  { name: 'Outside India (Export / LUT)', code: '96' },
];

