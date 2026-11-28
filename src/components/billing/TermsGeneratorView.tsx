'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ScrollText, Save, Download, Printer, Sparkles, Loader2 } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';
import { exportInvoiceElementToPdf } from '@/lib/billing/exportService';
import { detectLegacyTermsContent } from '@/lib/billing/legacyDraftImporter';

const DEFAULT_TERMS_MARKDOWN = `1. Scope of Work & Deliverables
**Scope Definition:** All deliverables, milestones, and technical specifications shall adhere strictly to the approved quotation or statement of work issued by ChittorTech.
- Any additional features or third-party integrations beyond the agreed scope will be billed via a formal Change Request.

2. Payment Schedule & Late Fees
**Standard Payment Terms:** Invoices are payable within 15 days of issue unless mutually agreed otherwise in writing.
- Delayed payments beyond 15 days may attract an administrative interest charge of 1.5% per month.
- Statutory GST (CGST/SGST or IGST) is charged extra as applicable under Indian tax regulations.

3. Intellectual Property & Licensing
**Ownership Transfer:** Ownership of bespoke deliverables transfers to the Client only upon receipt of 100% of invoiced milestone payments.

4. Confidentiality & Jurisdiction
**Governing Law:** Both parties agree to maintain strict confidentiality. All disputes are subject exclusively to the jurisdiction of courts in Chittorgarh, Rajasthan.`;

export const TermsGeneratorView: React.FC = () => {
  const { activeBusiness } = useBusiness();
  const { showSuccess, showError } = useConfirmationModal();
  const previewRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('Master Terms & Conditions');
  const [subtitle, setSubtitle] = useState(
    'Standard Service, Software & Commercial Supply Agreement'
  );
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawContent, setRawContent] = useState(DEFAULT_TERMS_MARKDOWN);
  const [legacyAvailable, setLegacyAvailable] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLegacyAvailable(detectLegacyTermsContent());
    const loadSaved = async () => {
      try {
        const res = await fetch(
          `/api/billing/terms?businessId=${encodeURIComponent(activeBusiness.id)}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.terms) {
            setTitle(data.terms.clientName || 'Master Terms & Conditions');
            setEffectiveDate(data.terms.effectiveDate || effectiveDate);
            setRawContent(data.terms.content || DEFAULT_TERMS_MARKDOWN);
          }
        }
      } catch {
        // fallback cleanly
      }
    };
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/billing/terms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusiness.id,
          title,
          subtitle,
          effectiveDate,
          rawContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError({ title: 'Could Not Save Terms', message: data.error || 'Save failed.' });
        return;
      }
      showSuccess({
        title: 'Terms & Conditions Saved',
        message: `Legal annexure saved for ${activeBusiness.tradeName}.`,
        duration: 2200,
      });
    } catch {
      showError({ title: 'Network Error', message: 'Failed to save Terms document.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = async () => {
    if (!previewRef.current) return;
    await exportInvoiceElementToPdf(
      previewRef.current,
      `${activeBusiness.tradeName}_Terms_And_Conditions`
    );
  };

  // Parse numbered headings (e.g. "1. Heading"), bullets ("- text"), and **bold:** labels from legacy terms.html
  const parsedLines = rawContent.split('\n');

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-lg font-bold text-[#0F172A]">
              Terms &amp; Conditions Generator • {activeBusiness.tradeName}
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Create A4 legal annexures with clause numbering &amp; automatic ChittorTech letterhead branding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {legacyAvailable && (
            <button
              type="button"
              onClick={() => setRawContent(legacyAvailable)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
            >
              <Sparkles className="w-3.5 h-3.5" /> Import Legacy Terms
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={handlePdf}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" /> A4 PDF
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Annexure
          </button>
        </div>
      </div>

      {/* Editor & A4 Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Clauses (supports &quot;1. Title&quot;, &quot;- Bullet&quot;, &quot;**Bold:**&quot;)
            </label>
            <textarea
              rows={18}
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-[11px] leading-relaxed"
            />
          </div>
        </div>

        <div className="lg:col-span-7 bg-slate-200/75 rounded-2xl border border-slate-300 p-4 overflow-x-auto flex justify-center">
          <div
            ref={previewRef}
            className="bg-white text-slate-900 border border-slate-300 p-8 space-y-5 shadow-md shrink-0"
            style={{ width: '794px', minHeight: '1050px' }}
          >
            <div className="flex items-center justify-between pb-4 border-b-2 border-[#0F2942]">
              <div className="flex items-center gap-3">
                <img
                  src={activeBusiness.logoUrl || '/images/chittortech_logo.png'}
                  alt={activeBusiness.tradeName}
                  className="h-12 w-12 object-contain"
                />
                <div>
                  <h3 className="text-lg font-extrabold text-[#0F2942]">{activeBusiness.legalName}</h3>
                  <p className="text-[10.5px] text-slate-600">{activeBusiness.address}</p>
                </div>
              </div>
              <div className="text-right text-[10px]">
                <p className="font-bold text-[#0F9D92] uppercase tracking-wider">Legal Annexure</p>
                <p className="text-slate-600">Effective: {effectiveDate}</p>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-xl font-extrabold text-[#0F2942] uppercase tracking-wide">
                {title}
              </h1>
              {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
            </div>

            <div className="space-y-2 text-[11.5px] leading-relaxed text-slate-800">
              {parsedLines.map((raw, i) => {
                const line = raw.trim();
                if (!line) return <div key={i} className="h-1.5" />;
                if (/^\d+\.\s+/.test(line)) {
                  return (
                    <h4
                      key={i}
                      className="text-[12.5px] font-extrabold text-[#0F2942] pt-2 border-b border-slate-200 pb-0.5"
                    >
                      {line}
                    </h4>
                  );
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return (
                    <div key={i} className="flex items-start gap-2 pl-4">
                      <span className="text-[#0F9D92] font-bold">•</span>
                      <span>{line.slice(2)}</span>
                    </div>
                  );
                }
                const boldMatch = line.match(/^\*\*(.+?)\*\*(.*)$/);
                if (boldMatch) {
                  return (
                    <p key={i}>
                      <strong className="text-[#0F2942]">{boldMatch[1]}</strong>
                      {boldMatch[2]}
                    </p>
                  );
                }
                return <p key={i}>{line}</p>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
