import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

export const MAX_FAILED_LOGIN_ATTEMPTS = 3;
export const LOGIN_LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const LOGIN_LOCKOUT_SECONDS = 300;
export const IP_RATE_LIMIT_MAX_REQUESTS = 20;
export const IP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const LOCKOUT_DISPLAY_MESSAGE =
  'Too many unsuccessful login attempts. Your account has been temporarily locked for 5 minutes. Please try again later.';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const LOCKOUT_COOKIE_NAME = 'ct_billing_login_guard';

export interface AccountLockoutState {
  failedAttempts: number;
  remainingAttempts: number;
  locked: boolean;
  lockedUntil: number | null;
  remainingSeconds: number;
}

interface StoredAttemptRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  updatedAt: number;
}

interface SecurityStoreSnapshot {
  accounts: Record<string, StoredAttemptRecord>;
  ipWindows: Record<string, number[]>;
  spentTokens: Record<string, number>;
}

declare global {
  var __ctBillingSecurityMutexes: Map<string, Promise<void>> | undefined;
  var __ctBillingSecurityStore: SecurityStoreSnapshot | undefined;
}

function extractCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === name) {
      return pair.slice(idx + 1).trim();
    }
  }
  return null;
}

function getStorePath(): string {
  const nextDir = path.join(process.cwd(), '.next');
  if (fs.existsSync(nextDir)) {
    return path.join(nextDir, 'ct-billing-login-security-store.json');
  }
  return path.join(os.tmpdir(), 'ct-billing-login-security-store.json');
}

function readLocalStore(): SecurityStoreSnapshot {
  if (globalThis.__ctBillingSecurityStore) {
    return globalThis.__ctBillingSecurityStore;
  }

  const empty: SecurityStoreSnapshot = { accounts: {}, ipWindows: {}, spentTokens: {} };
  try {
    const filePath = getStorePath();
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        const snapshot: SecurityStoreSnapshot = {
          accounts: parsed.accounts && typeof parsed.accounts === 'object' ? parsed.accounts : {},
          ipWindows: parsed.ipWindows && typeof parsed.ipWindows === 'object' ? parsed.ipWindows : {},
          spentTokens: parsed.spentTokens && typeof parsed.spentTokens === 'object' ? parsed.spentTokens : {},
        };
        globalThis.__ctBillingSecurityStore = snapshot;
        return snapshot;
      }
    }
  } catch {
    // fallback cleanly to in-memory snapshot
  }

  globalThis.__ctBillingSecurityStore = empty;
  return empty;
}

function writeLocalStore(snapshot: SecurityStoreSnapshot): void {
  globalThis.__ctBillingSecurityStore = snapshot;
  try {
    const now = Date.now();
    for (const [k, exp] of Object.entries(snapshot.spentTokens)) {
      if (now >= exp) delete snapshot.spentTokens[k];
    }
    const filePath = getStorePath();
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(snapshot), 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch {
    // ignore ephemeral/read-only filesystem errors (Vercel serverless falls back cleanly to signed guard cookie)
  }
}

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashGuardKey(identifier: string): string {
  return crypto.createHash('sha256').update(`ct-billing-guard-v1:${identifier}`).digest('hex');
}

/**
 * Serializes concurrent async requests for the same guard key so race conditions cannot bypass the 3-attempt limit.
 */
export async function withAccountMutex<T>(rawKey: string, task: () => Promise<T>): Promise<T> {
  if (!globalThis.__ctBillingSecurityMutexes) {
    globalThis.__ctBillingSecurityMutexes = new Map();
  }
  const key = hashGuardKey(rawKey);
  const map = globalThis.__ctBillingSecurityMutexes;
  const previous = map.get(key) || Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => current, () => current);
  map.set(key, chained);

  await previous;
  try {
    return await task();
  } finally {
    release();
    if (map.get(key) === chained) {
      map.delete(key);
    }
  }
}

export function getClientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return '127.0.0.1';
}

export function getTurnstileServerConfig(): {
  configured: boolean;
  siteKey: string;
  secretKey: string;
  isTestKeys: boolean;
} {
  const envSiteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim();
  const envSecretKey = (process.env.TURNSTILE_SECRET_KEY || '').trim();

  const hasEnvSite =
    Boolean(envSiteKey) && !envSiteKey.includes('your-') && !envSiteKey.includes('placeholder');
  const hasEnvSecret =
    Boolean(envSecretKey) && !envSecretKey.includes('your-') && !envSecretKey.includes('placeholder');

  if (hasEnvSite && hasEnvSecret) {
    return {
      configured: true,
      siteKey: envSiteKey,
      secretKey: envSecretKey,
      isTestKeys: false,
    };
  }

  return {
    configured: false,
    siteKey: '',
    secretKey: '',
    isTestKeys: false,
  };
}

/**
 * Verifies a Cloudflare Turnstile token strictly on the server and blocks replay attacks.
 */
export async function verifyTurnstileToken(
  token: string,
  clientIp: string
): Promise<{ ok: boolean; code?: string; error?: string }> {
  const cfg = getTurnstileServerConfig();
  if (!cfg.configured || !cfg.secretKey) {
    return {
      ok: false,
      code: 'CAPTCHA_NOT_CONFIGURED',
      error: 'Security CAPTCHA verification is not configured on the server.',
    };
  }

  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (!trimmed || trimmed.length < 10 || trimmed.length > 4096) {
    return {
      ok: false,
      code: 'CAPTCHA_REQUIRED',
      error: 'Please complete the CAPTCHA verification before signing in.',
    };
  }

  const tokenHash = hashGuardKey(`turnstile-token:${trimmed}`);
  return withAccountMutex(`tok:${tokenHash}`, async () => {
    const store = readLocalStore();
    const nowMs = Date.now();
    if (store.spentTokens[tokenHash] && store.spentTokens[tokenHash] > nowMs) {
      return {
        ok: false,
        code: 'CAPTCHA_REPLAYED',
        error: 'CAPTCHA verification has already been used or expired. Please complete it again.',
      };
    }

    try {
      const formBody = new URLSearchParams();
      formBody.set('secret', cfg.secretKey);
      formBody.set('response', trimmed);
      if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
        formBody.set('remoteip', clientIp);
      }

      const res = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) {
        return {
          ok: false,
          code: 'CAPTCHA_SERVICE_ERROR',
          error: 'Unable to verify CAPTCHA challenge right now. Please try again.',
        };
      }

      const result = (await res.json().catch(() => null)) as {
        success?: boolean;
        'error-codes'?: string[];
      } | null;

      if (!result?.success) {
        return {
          ok: false,
          code: 'CAPTCHA_FAILED',
          error: 'CAPTCHA verification failed. Please complete the challenge again.',
        };
      }

      const refreshedStore = readLocalStore();
      refreshedStore.spentTokens[tokenHash] = Date.now() + 5 * 60 * 1000;
      writeLocalStore(refreshedStore);

      return { ok: true };
    } catch {
      return {
        ok: false,
        code: 'CAPTCHA_SERVICE_ERROR',
        error: 'CAPTCHA verification timed out. Please retry the security check.',
      };
    }
  });
}

export async function checkIpRateLimit(
  clientIp: string,
  nowMs: number = Date.now()
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const ipKey = hashGuardKey(`ip:${clientIp || 'unknown'}`);
  return withAccountMutex(`ip-rl:${ipKey}`, async () => {
    const store = readLocalStore();
    const validTimestamps = (store.ipWindows[ipKey] || []).filter(
      (ts) => nowMs - ts < IP_RATE_LIMIT_WINDOW_MS
    );

    if (validTimestamps.length >= IP_RATE_LIMIT_MAX_REQUESTS) {
      const oldest = validTimestamps[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((IP_RATE_LIMIT_WINDOW_MS - (nowMs - oldest)) / 1000)
      );
      store.ipWindows[ipKey] = validTimestamps;
      writeLocalStore(store);
      return { allowed: false, retryAfterSeconds };
    }

    validTimestamps.push(nowMs);
    store.ipWindows[ipKey] = validTimestamps;
    writeLocalStore(store);
    return { allowed: true, retryAfterSeconds: 0 };
  });
}

function getGuardSecret(): Buffer {
  const base =
    process.env.SESSION_SIGNING_SECRET?.trim() ||
    process.env.OTP_SIGNING_SECRET?.trim() ||
    process.env.TURNSTILE_SECRET_KEY?.trim() ||
    process.env.ADMIN_ACCESS_KEY?.trim() ||
    'chittortech-billing-guard-fallback';
  return crypto.createHash('sha256').update(`ct-billing-guard-secret:${base}`).digest();
}

function formatLockoutState(
  failedAttempts: number,
  lockedUntilMs: number | null,
  nowMs: number = Date.now()
): AccountLockoutState {
  const isLocked = Boolean(lockedUntilMs && lockedUntilMs > nowMs);
  const remainingSeconds =
    isLocked && lockedUntilMs ? Math.max(1, Math.ceil((lockedUntilMs - nowMs) / 1000)) : 0;
  return {
    failedAttempts: isLocked ? MAX_FAILED_LOGIN_ATTEMPTS : failedAttempts,
    remainingAttempts: isLocked ? 0 : Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - failedAttempts),
    locked: isLocked,
    lockedUntil: isLocked ? lockedUntilMs : null,
    remainingSeconds,
  };
}

function readSignedGuardCookie(
  request: Request,
  guardKey: string,
  nowMs: number
): StoredAttemptRecord | null {
  const raw = extractCookieValue(request.headers.get('cookie'), LOCKOUT_COOKIE_NAME);
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac('sha256', getGuardSecret()).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(sigB64);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      k?: string;
      f?: number;
      l?: number | null;
      u?: number;
    };
    if (parsed?.k !== guardKey || typeof parsed.f !== 'number') return null;
    if (parsed.l && parsed.l <= nowMs) return null;
    return {
      failedAttempts: Math.max(0, Math.min(MAX_FAILED_LOGIN_ATTEMPTS, parsed.f)),
      lockedUntil: typeof parsed.l === 'number' ? parsed.l : null,
      updatedAt: typeof parsed.u === 'number' ? parsed.u : nowMs,
    };
  } catch {
    return null;
  }
}

export function attachLoginGuardCookie(
  response: NextResponse,
  email: string,
  state: AccountLockoutState,
  request: Request
): void {
  const guardKey = hashGuardKey(`acct:${normalizeLoginEmail(email)}`);
  const payloadB64 = Buffer.from(
    JSON.stringify({
      k: guardKey,
      f: state.failedAttempts,
      l: state.lockedUntil,
      u: Date.now(),
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getGuardSecret()).update(payloadB64).digest('base64url');
  const proto = request.headers.get('x-forwarded-proto');
  const isSecure = proto ? proto === 'https' : process.env.NODE_ENV === 'production';

  response.cookies.set(LOCKOUT_COOKIE_NAME, `${payloadB64}.${sig}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/api/auth',
    secure: isSecure,
    maxAge: 60 * 60,
  });
}

export function clearLoginGuardCookie(response: NextResponse, request: Request): void {
  const proto = request.headers.get('x-forwarded-proto');
  const isSecure = proto ? proto === 'https' : process.env.NODE_ENV === 'production';
  response.cookies.set(LOCKOUT_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/api/auth',
    secure: isSecure,
    maxAge: 0,
  });
}

export async function checkAccountLockout(
  email: string,
  nowMs: number = Date.now(),
  request?: Request
): Promise<AccountLockoutState> {
  const guardKey = hashGuardKey(`acct:${normalizeLoginEmail(email)}`);
  const store = readLocalStore();
  let rec: StoredAttemptRecord | null = store.accounts[guardKey] || null;

  if (rec?.lockedUntil && rec.lockedUntil <= nowMs) {
    delete store.accounts[guardKey];
    writeLocalStore(store);
    rec = null;
  }

  const cookieRec = request ? readSignedGuardCookie(request, guardKey, nowMs) : null;
  if (cookieRec) {
    if (
      !rec ||
      cookieRec.failedAttempts > rec.failedAttempts ||
      (cookieRec.lockedUntil || 0) > (rec.lockedUntil || 0)
    ) {
      rec = cookieRec;
      store.accounts[guardKey] = cookieRec;
      writeLocalStore(store);
    }
  }

  if (!rec) {
    return formatLockoutState(0, null, nowMs);
  }

  return formatLockoutState(rec.failedAttempts, rec.lockedUntil, nowMs);
}

export async function recordAccountLoginFailure(
  email: string,
  nowMs: number = Date.now(),
  request?: Request
): Promise<AccountLockoutState> {
  const guardKey = hashGuardKey(`acct:${normalizeLoginEmail(email)}`);
  const store = readLocalStore();
  let existing: StoredAttemptRecord | null = store.accounts[guardKey] || null;
  const cookieRec = request ? readSignedGuardCookie(request, guardKey, nowMs) : null;
  if (cookieRec && (!existing || cookieRec.failedAttempts > existing.failedAttempts)) {
    existing = cookieRec;
  }

  if (existing?.lockedUntil && existing.lockedUntil > nowMs) {
    return formatLockoutState(existing.failedAttempts, existing.lockedUntil, nowMs);
  }

  const baseCount =
    existing && (!existing.lockedUntil || existing.lockedUntil > nowMs)
      ? existing.failedAttempts
      : 0;
  const nextCount = Math.min(MAX_FAILED_LOGIN_ATTEMPTS, baseCount + 1);
  const nextLockedUntil =
    nextCount >= MAX_FAILED_LOGIN_ATTEMPTS ? nowMs + LOGIN_LOCKOUT_DURATION_MS : null;

  store.accounts[guardKey] = {
    failedAttempts: nextCount,
    lockedUntil: nextLockedUntil,
    updatedAt: nowMs,
  };
  writeLocalStore(store);

  return formatLockoutState(nextCount, nextLockedUntil, nowMs);
}

export async function resetAccountLoginFailures(email: string): Promise<void> {
  const guardKey = hashGuardKey(`acct:${normalizeLoginEmail(email)}`);
  const store = readLocalStore();
  if (store.accounts[guardKey]) {
    delete store.accounts[guardKey];
    writeLocalStore(store);
  }
}

