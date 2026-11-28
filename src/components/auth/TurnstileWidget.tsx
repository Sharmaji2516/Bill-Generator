'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: (errCode?: string) => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    __chittortechBillingTurnstileScriptPromise?: Promise<void>;
  }
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (window.__chittortechBillingTurnstileScriptPromise) {
    return window.__chittortechBillingTurnstileScriptPromise;
  }

  window.__chittortechBillingTurnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]'
    );
    if (existing) {
      if (window.turnstile) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load CAPTCHA script')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load CAPTCHA verification script'));
    document.head.appendChild(script);
  });

  return window.__chittortechBillingTurnstileScriptPromise;
}

interface TurnstileWidgetProps {
  siteKey: string;
  configured: boolean;
  isTestMode?: boolean;
  resetKey: number;
  error?: string;
  onTokenChange: (token: string | null) => void;
  onScriptError?: (msg: string) => void;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  configured,
  isTestMode = false,
  resetKey,
  error,
  onTokenChange,
  onScriptError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const onTokenRef = useRef(onTokenChange);
  const onErrorRef = useRef(onScriptError);

  useEffect(() => {
    onTokenRef.current = onTokenChange;
    onErrorRef.current = onScriptError;
  }, [onTokenChange, onScriptError]);

  useEffect(() => {
    if (!configured || !siteKey) return;
    let active = true;

    loadTurnstileScript()
      .then(() => {
        if (!active || !containerRef.current || !window.turnstile) return;
        setScriptLoaded(true);
        setLoadFailed(false);

        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore cleanup errors
          }
          widgetIdRef.current = null;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'light',
          size: 'flexible',
          callback: (token: string) => {
            onTokenRef.current(token);
          },
          'expired-callback': () => {
            onTokenRef.current(null);
          },
          'error-callback': () => {
            onTokenRef.current(null);
            onErrorRef.current?.('Security CAPTCHA challenge encountered an error. Please retry.');
          },
        });
      })
      .catch(() => {
        if (!active) return;
        setLoadFailed(true);
        onErrorRef.current?.(
          'Unable to load Cloudflare Turnstile verification. Check network connectivity.'
        );
      });

    return () => {
      active = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [configured, siteKey]);

  // Reset Turnstile challenge whenever resetKey increments (e.g., after a failed attempt)
  useEffect(() => {
    if (resetKey === 0) return;
    onTokenRef.current(null);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignore
      }
    }
  }, [resetKey]);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
          <span>Security Verification</span>
        </span>
        {isTestMode && (
          <span className="text-[10px] font-medium text-slate-400">Turnstile Test Mode</span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 leading-snug">
        Automated human check protecting your Billing Admin account from bots &amp; unauthorized
        logins. Wait for the green check before signing in.
      </p>

      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>CAPTCHA service is not configured. Contact your system administrator.</span>
        </div>
      ) : loadFailed ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>Failed to load security verification widget. Please refresh the page.</span>
        </div>
      ) : (
        <div
          className={`rounded-md border p-2 bg-slate-50/70 transition-colors ${
            error ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
          }`}
        >
          {!scriptLoaded && (
            <div className="flex items-center gap-2 py-2 px-1 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              <span>Loading security challenge...</span>
            </div>
          )}
          <div ref={containerRef} className="min-h-[65px] w-full flex items-center justify-center" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600 flex items-center gap-1 font-medium mt-1">
          <span className="inline-block w-1 h-1 rounded-full bg-red-600" />
          {error}
        </p>
      )}
    </div>
  );
};

