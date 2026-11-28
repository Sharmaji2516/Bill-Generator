'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Header } from '@/components/common/Header';
import { DesktopOnlyGuard } from '@/components/common/DesktopOnlyGuard';
import { BillingDashboard } from '@/components/billing/BillingDashboard';
import { DashboardTab } from '@/types';

const TAB_PARAM_MAP: Record<string, DashboardTab> = {
  dashboard: 'dashboard',
  new_invoice: 'new_invoice',
  'new-invoice': 'new_invoice',
  invoices: 'invoices',
  quotations: 'quotations',
  customers: 'customers',
  products: 'products',
  payments: 'payments',
  reports: 'reports',
  terms: 'terms',
  business_settings: 'business_settings',
  settings: 'business_settings',
};

const TAB_TO_PARAM_MAP: Record<DashboardTab, string> = {
  dashboard: 'dashboard',
  new_invoice: 'new-invoice',
  invoices: 'invoices',
  quotations: 'quotations',
  customers: 'customers',
  products: 'products',
  payments: 'payments',
  reports: 'reports',
  terms: 'terms',
  business_settings: 'settings',
};

const STORAGE_TAB_KEY = 'chittortech_billing_active_tab';
const STORAGE_SCROLL_PREFIX = 'chittortech_billing_scroll_';

function HomePageContent() {
  const searchParams = useSearchParams();
  const { user, loading, logout } = useAuth();
  const [justAuthenticated, setJustAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!loading && !user && justAuthenticated) {
      setJustAuthenticated(false);
    }
  }, [loading, user, justAuthenticated]);

  const getInitialTab = useCallback((): DashboardTab => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromQuery = urlParams.get('tab') || searchParams?.get('tab');
      if (tabFromQuery && TAB_PARAM_MAP[tabFromQuery.toLowerCase()]) {
        return TAB_PARAM_MAP[tabFromQuery.toLowerCase()];
      }
      try {
        const savedTab = sessionStorage.getItem(STORAGE_TAB_KEY);
        if (savedTab && TAB_PARAM_MAP[savedTab.toLowerCase()]) {
          return TAB_PARAM_MAP[savedTab.toLowerCase()];
        }
      } catch {
        // ignore storage errors
      }
    }
    return 'dashboard';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');

  useEffect(() => {
    setMounted(true);
    const initial = getInitialTab();
    setActiveTab(initial);
    try {
      sessionStorage.setItem(STORAGE_TAB_KEY, TAB_TO_PARAM_MAP[initial]);
      const currentParam = new URLSearchParams(window.location.search).get('tab');
      const expectedParam = TAB_TO_PARAM_MAP[initial];
      if (currentParam !== expectedParam && expectedParam !== 'dashboard') {
        window.history.replaceState({ tab: expectedParam }, '', `${window.location.pathname}?tab=${expectedParam}`);
      }
    } catch {}
    const savedY = sessionStorage.getItem(`${STORAGE_SCROLL_PREFIX}${initial}`);
    if (savedY) {
      setTimeout(() => {
        window.scrollTo({ top: Number(savedY), behavior: 'instant' });
      }, 150);
    }
  }, [getInitialTab]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const resolvedTab: DashboardTab =
        tabParam && TAB_PARAM_MAP[tabParam.toLowerCase()]
          ? TAB_PARAM_MAP[tabParam.toLowerCase()]
          : 'dashboard';
      setActiveTab(resolvedTab);
      try {
        sessionStorage.setItem(STORAGE_TAB_KEY, TAB_TO_PARAM_MAP[resolvedTab]);
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          sessionStorage.setItem(`${STORAGE_SCROLL_PREFIX}${activeTab}`, String(window.scrollY));
        } catch {}
      }, 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mounted, activeTab]);

  const handleTabChange = useCallback(
    (newTab: DashboardTab) => {
      try {
        sessionStorage.setItem(`${STORAGE_SCROLL_PREFIX}${activeTab}`, String(window.scrollY));
      } catch {}
      setActiveTab(newTab);
      const tabParam = TAB_TO_PARAM_MAP[newTab];
      try {
        sessionStorage.setItem(STORAGE_TAB_KEY, tabParam);
      } catch {}
      if (typeof window !== 'undefined') {
        const url =
          newTab === 'dashboard'
            ? window.location.pathname
            : `${window.location.pathname}?tab=${tabParam}`;
        window.history.pushState({ tab: tabParam }, '', url);
      }
      try {
        const savedY = sessionStorage.getItem(`${STORAGE_SCROLL_PREFIX}${newTab}`);
        setTimeout(() => {
          window.scrollTo({ top: savedY ? Number(savedY) : 0, behavior: 'instant' });
        }, 80);
      } catch {}
    },
    [activeTab]
  );

  // 1. LMS-matched Enterprise Loading Screen
  if (!mounted || (loading && !user && !justAuthenticated)) {
    return (
      <div className="min-h-[100dvh] bg-[#F5F8FC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.08),transparent_60%)]" />

        <div className="relative w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-xl text-center space-y-6 animate-in fade-in duration-200">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF3FF] border border-[#D6E8FF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0F9D92] animate-pulse" />
            <span>ChittorTech Billing Node • Initializing</span>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white p-2.5 shadow-sm ring-4 ring-[#EAF3FF]">
              <Image
                src="/assets/images/ct-logo.png"
                alt="ChittorTech Logo"
                width={52}
                height={52}
                className="object-contain"
                priority
              />
            </div>

            <div>
              <h3 className="font-heading text-xl font-extrabold text-[#334155] tracking-tight">
                Chittor<span className="text-[#2563EB]">Tech</span>{' '}
                <span className="text-[10px] font-bold text-[#2563EB] uppercase px-2 py-0.5 rounded-full bg-[#EAF3FF] border border-[#D6E8FF] ml-1 align-middle">
                  Billing
                </span>
              </h3>
              <p className="text-xs text-[#64748B] mt-1 font-medium">
                Multi-Business GST &amp; Enterprise Invoicing Suite
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-1.5 w-full rounded-full bg-[#EAF3FF] overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#0F9D92] animate-pulse" />
            </div>
            <div className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#2563EB]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Restoring your billing workspace...</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F8FC] p-3.5 text-left text-[11px] text-[#64748B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#334155]">Admin 2FA Session</span>
              <span className="inline-flex items-center gap-1.5 text-[#2563EB] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-ping" />
                Verifying
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#334155]">Firebase Backend</span>
              <span className="inline-flex items-center gap-1.5 text-[#0F9D92] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0F9D92]" />
                chittor-tech
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#334155]">Business Group</span>
              <span className="font-mono font-semibold text-[#334155]">ChittorTech • Mewari Achaar • Visit Chittorgarh</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: 2FA Admin Login Gate wrapped in DesktopOnlyGuard
  if (!user && !justAuthenticated) {
    return (
      <DesktopOnlyGuard>
        <AuthLayout
          onAuthSuccess={() => {
            setJustAuthenticated(true);
          }}
        />
      </DesktopOnlyGuard>
    );
  }

  // 3. Authenticated Workspace (Exact LMS Shell & Responsive Margins)
  return (
    <DesktopOnlyGuard>
      <div className="min-h-[100dvh] bg-[#F5F8FC] text-[#334155] flex flex-col justify-between overflow-x-clip">
        <Header
          onOpenSettings={() => handleTabChange('business_settings')}
          onLogout={async () => {
            setJustAuthenticated(false);
            await logout();
          }}
        />

        <main className="flex-1 w-full px-3 sm:px-5 lg:px-6 py-4 sm:py-6">
          <BillingDashboard activeTab={activeTab} onTabChange={handleTabChange} />
        </main>

        <footer className="w-full border-t border-[#E2E8F0] bg-[#F1F6FC] py-4 text-center text-xs text-[#64748B]">
          <div className="w-full px-3 sm:px-5 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[#64748B]">
              © {new Date().getFullYear()} ChittorTech Billing Software • Chittorgarh, Rajasthan.
            </p>
            <div className="flex items-center gap-4 text-[#64748B] text-[11px]">
              <span>Firebase Project: chittor-tech</span>
              <span>•</span>
              <span>Collection: billing_details</span>
              <span>•</span>
              <button
                type="button"
                onClick={async () => {
                  setJustAuthenticated(false);
                  await logout();
                }}
                className="text-[#2563EB] hover:underline font-semibold"
              >
                Sign Out Session
              </button>
            </div>
          </div>
        </footer>
      </div>
    </DesktopOnlyGuard>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#F5F8FC] flex flex-col items-center justify-center p-4">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}

