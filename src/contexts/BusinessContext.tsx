'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  BillingCustomer,
  BillingInvoice,
  BillingPayment,
  BillingProduct,
  BusinessId,
  BusinessProfile,
} from '@/types';
import { DEFAULT_BUSINESS_PROFILES, BUSINESS_ORDER } from '@/lib/billing/businesses';
import { useAuth } from './AuthContext';

export interface CollectionStatusState {
  collection: string;
  projectId: string;
  firebaseConfigured: boolean;
  collectionReady: boolean;
  docCount: number;
  message: string;
}

interface BusinessContextType {
  businesses: BusinessProfile[];
  businessMap: Record<string, BusinessProfile>;
  activeBusinessId: BusinessId;
  activeBusiness: BusinessProfile;
  setActiveBusinessId: (id: BusinessId) => void;
  collectionStatus: CollectionStatusState | null;
  invoices: BillingInvoice[];
  customers: BillingCustomer[];
  products: BillingProduct[];
  payments: BillingPayment[];
  dataLoading: boolean;
  refreshStatus: () => Promise<void>;
  refreshBusinesses: () => Promise<void>;
  refreshAllData: (targetBiz?: BusinessId) => Promise<void>;
}

const STORAGE_BUSINESS_KEY = 'chittortech_billing_active_business';

const BusinessContext = createContext<BusinessContextType>({
  businesses: Object.values(DEFAULT_BUSINESS_PROFILES),
  businessMap: DEFAULT_BUSINESS_PROFILES,
  activeBusinessId: 'chittortech',
  activeBusiness: DEFAULT_BUSINESS_PROFILES.chittortech,
  setActiveBusinessId: () => {},
  collectionStatus: null,
  invoices: [],
  customers: [],
  products: [],
  payments: [],
  dataLoading: false,
  refreshStatus: async () => {},
  refreshBusinesses: async () => {},
  refreshAllData: async () => {},
});

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>(
    BUSINESS_ORDER.map((id) => DEFAULT_BUSINESS_PROFILES[id])
  );
  const [activeBusinessId, setActiveBusinessIdState] = useState<BusinessId>('chittortech');
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatusState | null>(null);

  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [customers, setCustomers] = useState<BillingCustomer[]>([]);
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Restore active business from sessionStorage cleanly
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_BUSINESS_KEY);
      if (saved && BUSINESS_ORDER.includes(saved)) {
        setActiveBusinessIdState(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setActiveBusinessId = useCallback((id: BusinessId) => {
    setActiveBusinessIdState(id);
    try {
      sessionStorage.setItem(STORAGE_BUSINESS_KEY, id);
    } catch {
      // ignore storage errors
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/billing/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCollectionStatus(data);
      }
    } catch {
      // ignore transient error
    }
  }, [user]);

  const refreshBusinesses = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/billing/businesses', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.businesses) && data.businesses.length > 0) {
          setBusinesses(data.businesses);
        }
      }
    } catch {
      // keep defaults
    }
  }, [user]);

  const refreshAllData = useCallback(
    async (targetBiz?: BusinessId) => {
      if (!user) return;
      const bizId = targetBiz || activeBusinessId;
      setDataLoading(true);
      try {
        const [statusRes, bizRes, invRes, custRes, prodRes, payRes] = await Promise.all([
          fetch('/api/billing/status', { cache: 'no-store' }),
          fetch('/api/billing/businesses', { cache: 'no-store' }),
          fetch('/api/billing/invoices', { cache: 'no-store' }),
          fetch(`/api/billing/customers?businessId=${encodeURIComponent(bizId)}`, { cache: 'no-store' }),
          fetch(`/api/billing/products?businessId=${encodeURIComponent(bizId)}`, { cache: 'no-store' }),
          fetch(`/api/billing/payments?businessId=${encodeURIComponent(bizId)}`, { cache: 'no-store' }),
        ]);

        if (statusRes.ok) setCollectionStatus(await statusRes.json());
        if (bizRes.ok) {
          const bData = await bizRes.json();
          if (Array.isArray(bData.businesses) && bData.businesses.length > 0) {
            setBusinesses(bData.businesses);
          }
        }
        if (invRes.ok) {
          const iData = await invRes.json();
          setInvoices(Array.isArray(iData.invoices) ? iData.invoices : []);
        }
        if (custRes.ok) {
          const cData = await custRes.json();
          setCustomers(Array.isArray(cData.customers) ? cData.customers : []);
        }
        if (prodRes.ok) {
          const pData = await prodRes.json();
          setProducts(Array.isArray(pData.products) ? pData.products : []);
        }
        if (payRes.ok) {
          const payData = await payRes.json();
          setPayments(Array.isArray(payData.payments) ? payData.payments : []);
        }
      } catch (err) {
        console.error('[BusinessContext refresh error]:', err);
      } finally {
        setDataLoading(false);
      }
    },
    [user, activeBusinessId]
  );

  useEffect(() => {
    if (user) {
      refreshAllData(activeBusinessId);
    } else {
      setInvoices([]);
      setCustomers([]);
      setProducts([]);
      setPayments([]);
      setCollectionStatus(null);
    }
  }, [user, activeBusinessId, refreshAllData]);

  const businessMap = businesses.reduce<Record<string, BusinessProfile>>((acc, b) => {
    acc[b.id] = b;
    return acc;
  }, {});

  const activeBusiness =
    businessMap[activeBusinessId] ||
    DEFAULT_BUSINESS_PROFILES[activeBusinessId] ||
    DEFAULT_BUSINESS_PROFILES.chittortech;

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        businessMap,
        activeBusinessId,
        activeBusiness,
        setActiveBusinessId,
        collectionStatus,
        invoices,
        customers,
        products,
        payments,
        dataLoading,
        refreshStatus,
        refreshBusinesses,
        refreshAllData,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => useContext(BusinessContext);

