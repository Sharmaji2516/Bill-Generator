'use client';

import React from 'react';
import Image from 'next/image';
import { Monitor } from 'lucide-react';

interface DesktopOnlyGuardProps {
  children: React.ReactNode;
}

/**
 * UI compatibility guard restricting visibility to viewports >= 700px.
 * Replicates ChittorTech LMS DesktopOnlyGuard & CSS media queries (@media max-width: 699.98px)
 * in globals.css for instant, zero-flicker switching without page reloads or state loss.
 */
export const DesktopOnlyGuard: React.FC<DesktopOnlyGuardProps> = ({ children }) => {
  return (
    <>
      {/* Full-Screen Compatibility Notice (< 700px) */}
      <div
        role="alert"
        aria-live="polite"
        className="ct-desktop-notice min-h-[100dvh] w-full bg-[#F5F8FC] text-[#334155] flex-col items-center justify-center p-4 sm:p-8"
      >
        <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-sm p-6 sm:p-10 text-center space-y-6">
          {/* Official ChittorTech Branding */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-1.5 shadow-2xs">
              <Image
                src="/assets/images/ct-logo.png"
                alt="ChittorTech Logo"
                width={34}
                height={34}
                className="object-contain"
              />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-[#334155]">
                  Chittor<span className="text-[#2563EB]">Tech</span>
                </span>
                <span className="rounded bg-[#EAF3FF] border border-[#D6E8FF] px-1.5 py-0.5 text-[9px] font-bold text-[#2563EB] uppercase tracking-wider">
                  Billing Suite
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#64748B]">
                ChittorTech Enterprise Billing &amp; GST Platform
              </p>
            </div>
          </div>

          <div className="h-px bg-[#E2E8F0]" />

          {/* Monitor Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF3FF] border border-[#D6E8FF] text-[#2563EB]">
            <Monitor className="h-9 w-9" />
          </div>

          {/* Notice Title & Body */}
          <div className="space-y-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#334155]">
              Desktop Experience Required
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              This Multi-Business GST Billing &amp; Invoicing Platform is designed and optimized for laptop and desktop computers.
            </p>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              To ensure an accurate invoice drafting experience, A4 print/PDF preview integrity, multi-column financial tables, and secure system usage, please access this application using a device with a minimum screen width of 700 pixels.
            </p>
          </div>

          {/* Minimum Width Badge */}
          <div className="rounded-xl border border-[#FDE68A] bg-[#FEF3C7] px-4 py-3 space-y-1">
            <p className="text-xs sm:text-sm font-bold text-[#B45309] font-mono">
              Minimum Supported Screen Width: 700px
            </p>
            <p className="text-[11px] text-[#92400E]">
              Please switch to a compatible device or widen your browser window.
            </p>
          </div>
        </div>
      </div>

      {/* Main Application Shell (>= 700px) */}
      <div className="ct-desktop-app-shell">{children}</div>
    </>
  );
};

