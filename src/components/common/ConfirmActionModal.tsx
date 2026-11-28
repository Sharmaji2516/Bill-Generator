'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, X } from 'lucide-react';

export interface ConfirmActionModalProps {
  isOpen: boolean;
  variant: 'danger' | 'status' | 'warning';
  title: string;
  subtitle?: string;
  description: string;
  targetLabel?: string;
  fromValue?: string;
  toValue?: string;
  requireReason?: boolean;
  showReasonInput?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonPresets?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  errorText?: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  variant,
  title,
  subtitle,
  description,
  targetLabel,
  fromValue,
  toValue,
  requireReason = false,
  showReasonInput = false,
  reasonLabel = 'Reason / Audit Note',
  reasonPlaceholder = 'Enter reason for audit log...',
  reasonPresets = [],
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  busy = false,
  errorText = null,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setLocalError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const borderAccent = isDanger
    ? 'border-red-200'
    : variant === 'warning'
    ? 'border-amber-200'
    : 'border-[#CBD5E1]';
  const headerBg = isDanger
    ? 'bg-red-50'
    : variant === 'warning'
    ? 'bg-amber-50'
    : 'bg-[#F5F8FC]';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requireReason && !reason.trim()) {
      setLocalError('Please provide a reason before confirming.');
      return;
    }
    setLocalError(null);
    onConfirm(reason.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-md rounded-2xl border ${borderAccent} bg-white shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150`}
      >
        {/* Header */}
        <div className={`px-6 py-4 ${headerBg} border-b ${borderAccent} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger
                  ? 'bg-red-100 text-red-700'
                  : variant === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#EAF3FF] text-[#2563EB]'
              }`}
            >
              {isDanger ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDanger ? 'text-red-900' : 'text-[#0F172A]'}`}>
                {title}
              </h3>
              {subtitle && (
                <p className={`text-[11px] font-medium ${isDanger ? 'text-red-700' : 'text-[#64748B]'}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70 transition-colors"
            aria-label="Close confirmation dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#475569] leading-relaxed">{description}</p>

          {targetLabel && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
              <span className="text-[#64748B] font-medium">Target Record</span>
              <span className="font-mono font-bold text-[#0F172A] truncate">{targetLabel}</span>
            </div>
          )}

          {fromValue && toValue && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F5F8FC] p-3 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 text-[#334155] font-bold">
                {fromValue}
              </span>
              <span className="text-[#64748B] font-bold">→</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#D6E8FF] text-[#2563EB] font-bold">
                {toValue}
              </span>
            </div>
          )}

          {(showReasonInput || requireReason) && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-[#334155]">
                {reasonLabel}{' '}
                {requireReason ? (
                  <span className="text-rose-600">*</span>
                ) : (
                  <span className="font-normal text-[#64748B]">(Optional)</span>
                )}
              </label>
              {reasonPresets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {reasonPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setReason(preset);
                        setLocalError(null);
                      }}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                        reason === preset
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setLocalError(null);
                }}
                placeholder={reasonPlaceholder}
                className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 focus:outline-none resize-none"
              />
            </div>
          )}

          {(localError || errorText) && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
              {localError || errorText}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#334155] hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-60 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#2563EB] hover:bg-blue-700'
            }`}
          >
            {busy ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

