'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { LoginForm } from './LoginForm';
import { BlossomPetals } from '@/components/common/BlossomPetals';
import { ShieldCheck, FileText, Building2, Database } from 'lucide-react';

interface AuthLayoutProps {
  onAuthSuccess: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ onAuthSuccess }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.08, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[100dvh] w-full bg-slate-50 flex flex-col justify-between p-3 sm:p-5 lg:p-7 overflow-x-hidden"
    >
      <BlossomPetals />

      {/* Top Subtle Industrial Header (Exact LMS AuthLayout) */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-500 py-1">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
          <span>ChittorTech Enterprise Infrastructure</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-slate-500">Multi-Business GST Billing System</span>
          <span className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>2FA Email OTP Secured</span>
          </span>
        </div>
      </header>

      {/* Main Content Container (Exact LMS AuthLayout 12-column grid) */}
      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Side: Enterprise Branding & Value Proposition */}
          <div
            ref={heroRef}
            className="lg:col-span-6 flex flex-col justify-center space-y-4 px-2 sm:px-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-white border border-slate-200 p-2 shadow-subtle flex items-center justify-center shrink-0">
                <Image
                  src="/assets/images/ct-logo.png"
                  alt="ChittorTech Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
                    Chittor<span className="text-blue-600">Tech</span>
                  </h1>
                  <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    BILLING
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  ChittorTech • Mewari Achaar • Visit Chittorgarh
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">
                Unified Multi-Business GST Invoicing &amp; Ledger Control
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                Manage tax invoices, quotations, proformas, payment receipts, customer ledgers, and compliance reports across ChittorTech and its group entities inside a single synchronized workspace.
              </p>
            </div>

            {/* Clean Enterprise Highlight Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1 max-w-md">
              <div className="flex items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white/70 p-2.5 shadow-2xs">
                <div className="rounded bg-blue-50 p-1.5 text-blue-600 shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Multi-Entity</h3>
                  <p className="text-[11px] text-slate-500">Parent &amp; subsidiary isolation</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white/70 p-2.5 shadow-2xs">
                <div className="rounded bg-teal-50 p-1.5 text-teal-600 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">GST &amp; A4 PDF</h3>
                  <p className="text-[11px] text-slate-500">CGST/SGST, IGST &amp; Print</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white/70 p-2.5 shadow-2xs">
                <div className="rounded bg-slate-100 p-1.5 text-slate-700 shrink-0">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Firebase Linked</h3>
                  <p className="text-[11px] text-slate-500">chittor-tech / billing_details</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white/70 p-2.5 shadow-2xs">
                <div className="rounded bg-emerald-50 p-1.5 text-emerald-600 shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Audit &amp; 2FA</h3>
                  <p className="text-[11px] text-slate-500">Email OTP + Immutable log</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Interactive Authentication Card */}
          <div className="lg:col-span-6 flex justify-center w-full">
            <div
              ref={cardRef}
              className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 sm:p-7 shadow-elevated transition-all"
            >
              <LoginForm onSuccess={onAuthSuccess} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer Information (Exact LMS AuthLayout footer) */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-2 text-[11px] text-slate-400 py-1">
        <p>© {new Date().getFullYear()} ChittorTech. All rights reserved.</p>
        <p>Chittorgarh, Rajasthan • Enterprise Financial Suite</p>
      </footer>
    </div>
  );
};

