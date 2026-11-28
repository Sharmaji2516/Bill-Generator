'use client';

import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ModalState } from '@/contexts/ConfirmationModalContext';

interface CentralConfirmationModalProps {
  modalState: ModalState;
  onClose: () => void;
}

export const CentralConfirmationModal: React.FC<CentralConfirmationModalProps> = ({
  modalState,
  onClose,
}) => {
  const { isOpen, type, title, message, referenceText, badgeText, autoClose, duration } = modalState;
  const [progressWidth, setProgressWidth] = useState(100);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && autoClose && duration && duration > 0) {
      setProgressWidth(100);
      const t = setTimeout(() => setProgressWidth(0), 30);
      return () => clearTimeout(t);
    }
    setProgressWidth(100);
  }, [isOpen, autoClose, duration, title, message]);

  if (!isOpen) return null;

  const isError = type === 'error';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="central-modal-title"
    >
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Centered Enterprise Card */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-900/15 p-6 sm:p-8 text-center overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          aria-label="Close notification"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Central Emblem */}
        <div className="flex justify-center mb-5 mt-1">
          <div className="relative flex items-center justify-center">
            <div
              className={`absolute w-24 h-24 rounded-full success-glow-ring ${
                isError ? 'bg-rose-400/20' : 'bg-emerald-400/20'
              }`}
            />

            {isError ? (
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-100 text-rose-600 shadow-sm">
                <AlertTriangle className="w-10 h-10 sm:w-11 sm:h-11 relative z-10 stroke-[2.2]" />
              </div>
            ) : (
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-100 text-emerald-600 shadow-sm">
                <svg
                  className="w-11 h-11 sm:w-12 sm:h-12 text-emerald-600 relative z-10"
                  viewBox="0 0 52 52"
                  fill="none"
                >
                  <circle
                    cx="26"
                    cy="26"
                    r="21"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    className="success-circle-draw opacity-25"
                  />
                  <path
                    d="M15 26.5L22.5 34L37 19"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="success-check-draw"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className="flex justify-center mb-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
              isError
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {isError ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <ShieldCheck className="w-3 h-3" />
            )}
            {badgeText || (isError ? 'Action Interrupted' : 'ChittorTech Enterprise Verified')}
          </span>
        </div>

        <h3
          id="central-modal-title"
          className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-2"
        >
          {title}
        </h3>

        <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed max-w-xs mx-auto">
          {message}
        </p>

        {referenceText && (
          <p className="mt-2 text-xs text-slate-500 font-medium font-mono px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-lg inline-block max-w-full truncate">
            {referenceText}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            className={`w-full sm:w-auto min-w-[140px] px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all focus:outline-none focus:ring-2 ${
              isError
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/30'
                : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/30'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {!isError && <CheckCircle2 className="w-3.5 h-3.5" />}
              {isError ? 'Acknowledge & Fix' : 'Done'}
            </span>
          </button>
        </div>

        {autoClose && duration && duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
            <div
              className={`h-full transition-all ease-linear ${
                isError ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{
                width: `${progressWidth}%`,
                transitionDuration: `${duration}ms`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

