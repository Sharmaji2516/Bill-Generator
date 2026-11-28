'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { AuthInput } from './AuthInput';
import { TurnstileWidget } from './TurnstileWidget';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';

interface LoginFormProps {
  onSuccess: () => void;
}

const LOCKOUT_STORAGE_KEY = 'ct_billing_login_lockout_v1';

interface PersistedLockout {
  email: string;
  lockedUntil: number;
}

function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { setAuthenticatedSession, diagnostics } = useAuth();
  const { showSuccess, showError } = useConfirmationModal();

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Cloudflare Turnstile & 3-Attempt Lockout State
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
  );
  const [turnstileConfigured, setTurnstileConfigured] = useState<boolean>(
    Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  );
  const [turnstileIsTestMode, setTurnstileIsTestMode] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | undefined>(undefined);
  const [turnstileResetKey, setTurnstileResetKey] = useState<number>(0);

  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    let active = true;
    fetch('/api/auth', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.turnstile) return;
        setTurnstileConfigured(Boolean(data.turnstile.configured));
        setTurnstileSiteKey(data.turnstile.siteKey || '');
        setTurnstileIsTestMode(Boolean(data.turnstile.isTestKeys));
      })
      .catch(() => {
        // fallback cleanly to NEXT_PUBLIC env value
      });

    try {
      const saved = window.localStorage.getItem(LOCKOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PersistedLockout;
        if (parsed?.lockedUntil && parsed.lockedUntil > Date.now()) {
          if (parsed.email) setEmail(parsed.email);
          setLockedUntil(parsed.lockedUntil);
          setLockoutSecondsRemaining(Math.ceil((parsed.lockedUntil - Date.now()) / 1000));
        } else {
          window.localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        }
      }
    } catch {
      // ignore storage errors
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!lockedUntil) {
      setLockoutSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const diffSec = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (diffSec <= 0) {
        setLockedUntil(null);
        setLockoutSecondsRemaining(0);
        setError(null);
        setTurnstileResetKey((k) => k + 1);
        try {
          window.localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        } catch {
          // ignore
        }
      } else {
        setLockoutSecondsRemaining(diffSec);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleTurnstileTokenChange = useCallback((token: string | null) => {
    setTurnstileToken(token);
    if (token) setTurnstileError(undefined);
  }, []);

  const handleTurnstileScriptError = useCallback((msg: string) => {
    setTurnstileError(msg);
  }, []);

  const isLockedOut = lockoutSecondsRemaining > 0;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTurnstileError(undefined);

    if (isLockedOut) {
      setError(
        'Too many unsuccessful login attempts. Your account has been temporarily locked for 5 minutes. Please try again later.'
      );
      return;
    }

    if (!email.trim() || !passcode.trim()) {
      setError('Both ChittorTech admin email and access key are required.');
      return;
    }

    if (!turnstileToken) {
      const msg = 'Please complete the security CAPTCHA verification.';
      setTurnstileError(msg);
      setError(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_passcode_send_otp',
          email: email.trim(),
          passcode: passcode.trim(),
          turnstileToken,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setTurnstileToken(null);
        setTurnstileResetKey((k) => k + 1);

        if (res.status === 423 || data?.locked) {
          const until =
            typeof data.lockedUntil === 'number'
              ? data.lockedUntil
              : Date.now() + (Number(data.remainingSeconds) || 300) * 1000;
          setLockedUntil(until);
          setLockoutSecondsRemaining(Math.max(1, Math.ceil((until - Date.now()) / 1000)));
          try {
            window.localStorage.setItem(
              LOCKOUT_STORAGE_KEY,
              JSON.stringify({ email: email.trim().toLowerCase(), lockedUntil: until })
            );
          } catch {
            // ignore
          }
          setError(
            data.error ||
              'Too many unsuccessful login attempts. Your account has been temporarily locked for 5 minutes. Please try again later.'
          );
          return;
        }

        if (
          data?.code === 'CAPTCHA_REQUIRED' ||
          data?.code === 'CAPTCHA_FAILED' ||
          data?.code === 'CAPTCHA_REPLAYED' ||
          data?.code === 'CAPTCHA_NOT_CONFIGURED'
        ) {
          setTurnstileError(data.error);
        }

        setError(data.error || 'Unable to dispatch OTP code.');
        return;
      }

      setTurnstileToken(null);
      setStep('otp');
      setCooldown(30);
      showSuccess({
        title: 'Verification Code Sent',
        message: `A 6-digit OTP has been sent to ${data.email}. Check your inbox to complete 2FA.`,
        badgeText: 'Email 2FA Active',
        duration: 2400,
      });
    } catch {
      setTurnstileToken(null);
      setTurnstileResetKey((k) => k + 1);
      setError('Network error while connecting to ChittorTech authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the exact 6-digit numerical OTP received via email.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          otp: otp.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid or expired OTP.');
        return;
      }

      setAuthenticatedSession(data.session);
      try {
        window.localStorage.removeItem(LOCKOUT_STORAGE_KEY);
      } catch {
        // ignore
      }
      showSuccess({
        title: 'Signed In Successfully',
        message: 'Welcome back to ChittorTech Multi-Business Billing Software.',
        referenceText: `Authorized Admin: ${data.session.email}`,
        badgeText: 'ChittorTech Access Verified',
        duration: 1800,
        onCloseCallback: () => onSuccess(),
      });
    } catch {
      showError({
        title: 'Verification Error',
        message: 'Could not verify the OTP due to a connection failure.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3FF] border border-[#D6E8FF] px-2.5 py-0.5 text-[10px] font-bold text-[#2563EB] uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3 h-3" />
          <span>{step === 'credentials' ? 'Step 1 of 2 • Admin Access' : 'Step 2 of 2 • Email OTP'}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {step === 'credentials' ? 'Administrator Sign In' : 'Verify 6-Digit Email OTP'}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          {step === 'credentials'
            ? 'Authenticate with your ChittorTech authorized email and admin passcode.'
            : `Enter the 6-digit verification code emailed to ${email}.`}
        </p>
      </div>

      {diagnostics && (!diagnostics.hasPasscode || !diagnostics.hasAuthorizedEmails || !diagnostics.smtpConfigured) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
          <p className="font-bold">Environment Configuration Notice (.env.local)</p>
          <p className="text-[11px]">
            Ensure <code className="font-mono font-bold">ADMIN_ACCESS_KEY</code>,{' '}
            <code className="font-mono font-bold">AUTHORIZED_ADMIN_EMAILS</code>, and{' '}
            <code className="font-mono font-bold">SMTP_*</code> variables are set in your local{' '}
            <code className="font-mono font-bold">.env.local</code> file.
          </p>
        </div>
      )}

      {isLockedOut && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50/90 p-3 text-xs text-red-800 space-y-1.5"
        >
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-red-900">
                Too many unsuccessful login attempts. Your account has been temporarily locked for
                5 minutes. Please try again later.
              </p>
              <p className="text-[11px] font-mono font-bold text-red-700">
                Account unlocks in: {formatCountdown(lockoutSecondsRemaining)}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && !isLockedOut && (
        <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-fadeIn">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {step === 'credentials' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <AuthInput
            label="Authorized Admin Email"
            type="email"
            placeholder="admin@chittortech.in"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            disabled={loading || isLockedOut}
            required
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
          />

          <AuthInput
            label="Administrator Passcode"
            type="password"
            placeholder="Enter admin access key"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              if (error) setError(null);
            }}
            disabled={loading || isLockedOut}
            required
            autoComplete="current-password"
            icon={<KeyRound className="h-4 w-4" />}
          />

          <TurnstileWidget
            siteKey={turnstileSiteKey}
            configured={turnstileConfigured}
            isTestMode={turnstileIsTestMode}
            resetKey={turnstileResetKey}
            error={turnstileError}
            onTokenChange={handleTurnstileTokenChange}
            onScriptError={handleTurnstileScriptError}
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || isLockedOut || !turnstileConfigured || !turnstileToken}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Verification OTP...</span>
                </>
              ) : isLockedOut ? (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Account Locked ({formatCountdown(lockoutSecondsRemaining)})</span>
                </>
              ) : (
                <>
                  <span>Verify &amp; Send Email OTP</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <AuthInput
            label="6-Digit Email OTP"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            className="font-mono tracking-[0.35em] text-center font-bold text-base"
            icon={<ShieldCheck className="h-4 w-4" />}
          />

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setOtp('');
                setError(null);
                setTurnstileToken(null);
                setTurnstileResetKey((k) => k + 1);
              }}
              className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Change Credentials
            </button>

            <button
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={() => {
                setStep('credentials');
                setOtp('');
                setError('Complete Security Verification and submit to send a fresh OTP.');
                setTurnstileToken(null);
                setTurnstileResetKey((k) => k + 1);
              }}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400"
            >
              <RefreshCw className="h-3 w-3" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying OTP...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Unlock Billing Platform</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

