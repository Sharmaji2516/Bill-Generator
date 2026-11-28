'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AdminUserSession } from '@/types';

interface AuthDiagnostics {
  hasPasscode: boolean;
  hasAuthorizedEmails: boolean;
  hasSessionSecret: boolean;
  smtpConfigured: boolean;
}

interface AuthContextType {
  user: AdminUserSession | null;
  loading: boolean;
  configReady: boolean;
  diagnostics: AuthDiagnostics | null;
  refreshSession: () => Promise<void>;
  setAuthenticatedSession: (session: AdminUserSession | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  configReady: false,
  diagnostics: null,
  refreshSession: async () => {},
  setAuthenticatedSession: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AuthDiagnostics | null>(null);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth', { cache: 'no-store' });
      const data = await res.json();
      setConfigReady(Boolean(data.configReady));
      setDiagnostics(data.diagnostics || null);
      if (data.authenticated && data.session) {
        setUser(data.session as AdminUserSession);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const setAuthenticatedSession = useCallback((session: AdminUserSession | null) => {
    setUser(session);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // Ignore network errors during logout cleanup
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configReady,
        diagnostics,
        refreshSession,
        setAuthenticatedSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

