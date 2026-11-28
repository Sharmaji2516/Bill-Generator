'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  LogOut,
  Settings,
  Building2,
  Mail,
  ShieldCheck,
  ChevronDown,
  Copy,
  Check,
  HelpCircle,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { BusinessId } from '@/types';

interface HeaderProps {
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onLogout }) => {
  const { user } = useAuth();
  const { businesses, activeBusiness, setActiveBusinessId, collectionStatus } = useBusiness();
  const [profileOpen, setProfileOpen] = useState(false);
  const [bizMenuOpen, setBizMenuOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const bizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (bizRef.current && !bizRef.current.contains(e.target as Node)) {
        setBizMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setBizMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const userName = user?.name || 'Kush Sharma';
  const userEmail = user?.email || 'admin@chittortech.in';
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');

  const handleCopyEmail = () => {
    if (!userEmail) return;
    navigator.clipboard.writeText(userEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 1800);
  };

  const isCollectionReady = collectionStatus?.collectionReady;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-[#FFFFFF]">
      {/* Top Level Bar: Exact LMS height h-16 and horizontal responsive padding */}
      <div className="flex h-16 w-full items-center justify-between px-3 sm:px-5 lg:px-6 gap-3">
        {/* Left Brand + Active Business Selector */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-1 shadow-2xs shrink-0">
              <Image
                src="/assets/images/ct-logo.png"
                alt="ChittorTech Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-tight text-[#334155]">
                  Chittor<span className="text-[#2563EB]">Tech</span>
                </span>
                <span className="rounded bg-[#EAF3FF] border border-[#D6E8FF] px-1.5 py-0.5 text-[9px] font-bold text-[#2563EB] uppercase tracking-wider">
                  Billing Suite
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#64748B] truncate max-w-[190px] sm:max-w-[260px]">
                Multi-Business GST &amp; Enterprise Invoicing
              </p>
            </div>
          </div>

          {/* Active Business Profile Switcher */}
          <div className="relative pl-2 sm:pl-3 border-l border-[#E2E8F0]" ref={bizRef}>
            <button
              type="button"
              onClick={() => setBizMenuOpen((p) => !p)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-all ${
                bizMenuOpen
                  ? 'border-[#2563EB] bg-[#EAF3FF]/70 ring-2 ring-[#2563EB]/15'
                  : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EAF3FF]/50 hover:border-[#BFDBFE]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#0F172A] leading-tight truncate max-w-[130px] md:max-w-[180px]">
                  {activeBusiness.tradeName}
                </p>
                <p className="text-[9px] text-[#64748B] leading-tight truncate max-w-[130px] md:max-w-[180px]">
                  {activeBusiness.isParent
                    ? 'Parent Group Entity'
                    : `Subsidiary • ${activeBusiness.invoicePrefix}`}
                </p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#64748B] shrink-0 transition-transform ${
                  bizMenuOpen ? 'rotate-180 text-[#2563EB]' : ''
                }`}
              />
            </button>

            {bizMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Active Billing Entity
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600">Isolated Ledgers</span>
                </div>
                <div className="space-y-1">
                  {businesses.map((biz) => {
                    const isSelected = biz.id === activeBusiness.id;
                    return (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          setActiveBusinessId(biz.id as BusinessId);
                          setBizMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-[#EAF3FF] border border-[#BFDBFE] text-[#1E40AF]'
                            : 'hover:bg-slate-50 border border-transparent text-[#334155]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">{biz.tradeName}</span>
                            {biz.isParent && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-blue-600 text-white px-1.5 py-0.5 text-[9px] font-bold">
                                <Crown className="w-2.5 h-2.5" />
                                Parent
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#64748B] truncate mt-0.5">
                            {biz.gstin ? `GSTIN: ${biz.gstin}` : 'GSTIN / Tax Setup Pending'} • Prefix:{' '}
                            <span className="font-mono font-bold">{biz.invoicePrefix}</span>
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#2563EB] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions & Profile Flyout (Replicating LMS Header exactly) */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Firebase Collection Live Status Pill */}
          <div
            className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              isCollectionReady
                ? 'border-[#DCFCE7] bg-[#DCFCE7]'
                : 'border-[#FDE68A] bg-[#FEF3C7]'
            }`}
            title={collectionStatus?.message || 'Checking Firestore billing_details status'}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                isCollectionReady ? 'bg-[#15803D] animate-pulse' : 'bg-[#B45309]'
              }`}
            />
            <span
              className={`font-semibold ${
                isCollectionReady ? 'text-[#15803D]' : 'text-[#B45309]'
              }`}
            >
              {isCollectionReady ? 'billing_details Live' : 'Collection Setup Needed'}
            </span>
          </div>

          {/* Profile Trigger */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((p) => !p)}
              className={`flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${
                profileOpen
                  ? 'border-[#3B82F6] bg-[#EAF3FF]/60 ring-2 ring-[#3B82F6]/20'
                  : 'border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F5F8FC] hover:border-[#CBD5E1]'
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF3FF] border border-[#D6E8FF] text-[#2563EB] text-xs font-extrabold shrink-0">
                {initials || 'CT'}
              </div>

              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-[#334155] leading-tight truncate max-w-[200px]">
                  {userName}
                </p>
                <p className="text-[10px] text-[#64748B] leading-tight flex items-center gap-1 truncate max-w-[200px]">
                  <span>{userEmail}</span>
                </p>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-150 ${
                  profileOpen ? 'rotate-180 text-[#2563EB]' : ''
                }`}
              />
            </button>

            {/* Enterprise Profile Popover (Exact LMS dimensions w-80 sm:w-96) */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-base font-extrabold shadow-sm shrink-0">
                    {initials || 'CT'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        <ShieldCheck className="w-2.5 h-2.5" /> 2FA VERIFIED
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-blue-700 truncate mt-0.5">
                      Group Billing Administrator
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 mt-1 truncate max-w-full"
                      title="Copy Admin Email"
                    >
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{userEmail}</span>
                      {copiedEmail ? (
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Firebase & Multi-Entity Status Rows */}
                <div className="py-3.5 space-y-2 border-b border-slate-100 text-xs">
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50/70">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" /> Active Business
                    </span>
                    <span className="font-semibold text-slate-800 text-right truncate max-w-[165px]">
                      {activeBusiness.tradeName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50/70">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      {isCollectionReady ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      Firebase Collection
                    </span>
                    <span className="font-mono font-semibold text-slate-800 text-right truncate max-w-[165px]">
                      chittor-tech / billing_details
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3.5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenSettings();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-600" />
                    Multi-Business Setup &amp; Settings
                  </button>

                  <div className="flex items-center justify-between gap-2">
                    <a
                      href="mailto:business@chittortech.in"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100/70 transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Support
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout();
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

