import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { AdminUserSession } from '@/types';

export const SESSION_COOKIE_NAME = 'ct_billing_session';
export const OTP_COOKIE_NAME = 'ct_billing_otp_challenge';

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const OTP_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;

// Per-process sliding window rate limiter for auth endpoints
interface RateEntry {
  count: number;
  resetAt: number;
}
const authRateLimiter = new Map<string, RateEntry>();

export function checkAuthRateLimit(key: string, maxRequests = 8, windowMs = 10 * 60 * 1000): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const existing = authRateLimiter.get(key);
  if (!existing || existing.resetAt <= now) {
    authRateLimiter.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (existing.count >= maxRequests) {
    return { allowed: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  authRateLimiter.set(key, existing);
  return { allowed: true, retryAfterSec: 0 };
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret || secret.length < 16) {
    // Ephemeral per-boot fallback so dev/build works safely without hardcoded production keys;
    // production deployments must configure SESSION_SIGNING_SECRET in .env.local.
    return crypto.createHash('sha256').update(`ct-billing-ephemeral-${process.pid}`).digest('hex');
  }
  return secret;
}

function getOtpSecret(): string {
  return process.env.OTP_SIGNING_SECRET || getSessionSecret();
}

export function isAuthConfigured(): {
  hasPasscode: boolean;
  hasAuthorizedEmails: boolean;
  hasSessionSecret: boolean;
} {
  return {
    hasPasscode: Boolean(process.env.ADMIN_ACCESS_KEY && process.env.ADMIN_ACCESS_KEY.trim().length > 0),
    hasAuthorizedEmails: getAuthorizedAdminEmails().length > 0,
    hasSessionSecret: Boolean(process.env.SESSION_SIGNING_SECRET && process.env.SESSION_SIGNING_SECRET.length >= 16),
  };
}

export function getAuthorizedAdminEmails(): string[] {
  const raw = process.env.AUTHORIZED_ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
}

export function isAuthorizedAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const allowed = getAuthorizedAdminEmails();
  return allowed.includes(normalized);
}

export function verifyAdminPasscode(passcode: string): boolean {
  const expected = (process.env.ADMIN_ACCESS_KEY || '').trim();
  const provided = (passcode || '').trim();
  if (!expected || !provided) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function signPayload(payloadB64: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

function verifySignedToken<T>(token: string, secret: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    const expectedSig = signPayload(payloadB64, secret);
    const sigBuf = Buffer.from(sig, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

export function generateSixDigitOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

interface OtpChallengePayload {
  email: string;
  otpHash: string;
  nonce: string;
  expiresAt: number;
  attempts: number;
}

function hashOtp(email: string, otp: string, nonce: string): string {
  return crypto
    .createHmac('sha256', getOtpSecret())
    .update(`${email.toLowerCase()}:${otp}:${nonce}`)
    .digest('hex');
}

export function createOtpChallengeToken(email: string, otp: string, attempts = 0): {
  token: string;
  expiresAt: number;
} {
  const nonce = crypto.randomBytes(12).toString('hex');
  const expiresAt = Date.now() + OTP_DURATION_MS;
  const payload: OtpChallengePayload = {
    email: email.trim().toLowerCase(),
    otpHash: hashOtp(email.trim().toLowerCase(), otp, nonce),
    nonce,
    expiresAt,
    attempts,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = signPayload(payloadB64, getOtpSecret());
  return { token: `${payloadB64}.${sig}`, expiresAt };
}

export function verifyOtpChallengeToken(
  token: string,
  enteredOtp: string
): {
  valid: boolean;
  email?: string;
  error?: string;
  updatedToken?: string;
  lockedOut?: boolean;
} {
  const payload = verifySignedToken<OtpChallengePayload>(token, getOtpSecret());
  if (!payload) {
    return { valid: false, error: 'OTP challenge expired or invalid. Please request a new code.' };
  }
  if (Date.now() > payload.expiresAt) {
    return { valid: false, error: 'Verification code expired. Please request a new 6-digit code.' };
  }
  if (payload.attempts >= MAX_OTP_ATTEMPTS) {
    return {
      valid: false,
      lockedOut: true,
      error: 'Maximum OTP attempts exceeded. Please sign in again to request a new code.',
    };
  }

  const candidateHash = hashOtp(payload.email, enteredOtp.trim(), payload.nonce);
  const a = Buffer.from(candidateHash, 'utf8');
  const b = Buffer.from(payload.otpHash, 'utf8');
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
    return { valid: true, email: payload.email };
  }

  const nextAttempts = payload.attempts + 1;
  const remaining = MAX_OTP_ATTEMPTS - nextAttempts;
  const updatedPayload: OtpChallengePayload = { ...payload, attempts: nextAttempts };
  const payloadB64 = Buffer.from(JSON.stringify(updatedPayload), 'utf8').toString('base64url');
  const sig = signPayload(payloadB64, getOtpSecret());

  return {
    valid: false,
    updatedToken: `${payloadB64}.${sig}`,
    lockedOut: remaining <= 0,
    error:
      remaining > 0
        ? `Incorrect 6-digit code. ${remaining} attempt(s) remaining.`
        : 'Maximum OTP attempts exceeded. Please restart login.',
  };
}

export function createSessionToken(email: string): { token: string; session: AdminUserSession } {
  const now = Date.now();
  const cleanEmail = email.trim().toLowerCase();
  const displayName = cleanEmail.startsWith('kush')
    ? 'Kush Sharma'
    : cleanEmail.startsWith('lav')
    ? 'Lav Sharma'
    : 'ChittorTech Administrator';

  const session: AdminUserSession = {
    email: cleanEmail,
    name: displayName,
    role: 'SUPER_ADMIN',
    authenticatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_DURATION_MS).toISOString(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  const sig = signPayload(payloadB64, getSessionSecret());
  return { token: `${payloadB64}.${sig}`, session };
}

export function verifySessionToken(token: string | undefined): AdminUserSession | null {
  if (!token) return null;
  const session = verifySignedToken<AdminUserSession>(token, getSessionSecret());
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) return null;
  if (!isAuthorizedAdminEmail(session.email)) return null;
  return session;
}

export async function getAuthenticatedSessionFromCookies(): Promise<AdminUserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function getAuthenticatedSessionFromRequest(req: NextRequest): AdminUserSession | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

