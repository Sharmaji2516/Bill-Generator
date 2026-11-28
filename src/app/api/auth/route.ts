import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  SESSION_COOKIE_NAME,
  OTP_COOKIE_NAME,
  checkAuthRateLimit,
  isAuthConfigured,
  isAuthorizedAdminEmail,
  verifyAdminPasscode,
  generateSixDigitOtp,
  createOtpChallengeToken,
  verifyOtpChallengeToken,
  createSessionToken,
  getAuthenticatedSessionFromRequest,
} from '@/lib/auth/security';
import {
  LOCKOUT_DISPLAY_MESSAGE,
  attachLoginGuardCookie,
  checkAccountLockout,
  checkIpRateLimit,
  clearLoginGuardCookie,
  getClientIp,
  getTurnstileServerConfig,
  normalizeLoginEmail,
  recordAccountLoginFailure,
  resetAccountLoginFailures,
  verifyTurnstileToken,
  withAccountMutex,
} from '@/lib/auth/loginSecurity';
import { sendBillingOtpEmail, getMailConfigStatus } from '@/lib/mail/mailer';

const sendOtpSchema = z.object({
  action: z.literal('verify_passcode_send_otp'),
  email: z.string().email('Please enter a valid ChittorTech admin email.'),
  passcode: z.string().min(1, 'Admin passcode is required.'),
  turnstileToken: z.string().optional().default(''),
});

const verifyOtpSchema = z.object({
  action: z.literal('verify_otp'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the exact 6-digit verification code.'),
});

const logoutSchema = z.object({
  action: z.literal('logout'),
});

const IS_PROD = process.env.NODE_ENV === 'production';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  const authCfg = isAuthConfigured();
  const mailCfg = getMailConfigStatus();
  const turnstileCfg = getTurnstileServerConfig();

  const emailParam = request.nextUrl.searchParams.get('email');
  const lockout =
    emailParam && emailParam.includes('@')
      ? await checkAccountLockout(emailParam, Date.now(), request)
      : null;

  return NextResponse.json({
    authenticated: Boolean(session),
    session: session || null,
    configReady: authCfg.hasPasscode && authCfg.hasAuthorizedEmails && mailCfg.configured,
    diagnostics: {
      hasPasscode: authCfg.hasPasscode,
      hasAuthorizedEmails: authCfg.hasAuthorizedEmails,
      hasSessionSecret: authCfg.hasSessionSecret,
      smtpConfigured: mailCfg.configured,
    },
    turnstile: {
      configured: turnstileCfg.configured,
      siteKey: turnstileCfg.siteKey,
      isTestKeys: turnstileCfg.isTestKeys,
    },
    lockout,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'logout') {
      logoutSchema.parse(body);
      const res = NextResponse.json({ success: true, message: 'Signed out cleanly.' });
      res.cookies.delete(SESSION_COOKIE_NAME);
      res.cookies.delete(OTP_COOKIE_NAME);
      return res;
    }

    const clientIp = getClientIp(request);

    if (action === 'verify_passcode_send_otp') {
      const parsed = sendOtpSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Invalid credentials payload.' },
          { status: 400 }
        );
      }

      const emailNormalized = normalizeLoginEmail(parsed.data.email);

      const ipLimit = await checkIpRateLimit(clientIp);
      if (!ipLimit.allowed) {
        return NextResponse.json(
          {
            error: `Too many sign-in attempts from this network. Please wait ${ipLimit.retryAfterSeconds} seconds before trying again.`,
            code: 'IP_RATE_LIMITED',
            retryAfterSeconds: ipLimit.retryAfterSeconds,
          },
          { status: 429 }
        );
      }

      const limit = checkAuthRateLimit(`send:${clientIp}:${emailNormalized}`, 10, 10 * 60 * 1000);
      if (!limit.allowed) {
        return NextResponse.json(
          { error: `Too many OTP requests. Please wait ${limit.retryAfterSec}s before retrying.` },
          { status: 429 }
        );
      }

      return await withAccountMutex(`login:${emailNormalized}`, async () => {
        const nowMs = Date.now();
        const lockoutState = await checkAccountLockout(emailNormalized, nowMs, request);
        if (lockoutState.locked) {
          const lockedRes = NextResponse.json(
            {
              error: LOCKOUT_DISPLAY_MESSAGE,
              code: 'ACCOUNT_LOCKED',
              locked: true,
              lockedUntil: lockoutState.lockedUntil,
              remainingSeconds: lockoutState.remainingSeconds,
              failedAttempts: lockoutState.failedAttempts,
              remainingAttempts: 0,
            },
            { status: 423 }
          );
          attachLoginGuardCookie(lockedRes, emailNormalized, lockoutState, request);
          return lockedRes;
        }

        const captchaCheck = await verifyTurnstileToken(parsed.data.turnstileToken, clientIp);
        if (!captchaCheck.ok) {
          const status = captchaCheck.code === 'CAPTCHA_NOT_CONFIGURED' ? 503 : 400;
          return NextResponse.json(
            {
              error: captchaCheck.error || 'Please complete the CAPTCHA verification.',
              code: captchaCheck.code || 'CAPTCHA_FAILED',
            },
            { status }
          );
        }

        const authCfg = isAuthConfigured();
        if (!authCfg.hasPasscode || !authCfg.hasAuthorizedEmails) {
          return NextResponse.json(
            {
              error:
                'Admin authentication environment variables (ADMIN_ACCESS_KEY / AUTHORIZED_ADMIN_EMAILS) are not configured on the server.',
            },
            { status: 503 }
          );
        }

        if (!isAuthorizedAdminEmail(emailNormalized) || !verifyAdminPasscode(parsed.data.passcode)) {
          const nextState = await recordAccountLoginFailure(emailNormalized, Date.now(), request);
          if (nextState.locked) {
            const lockedRes = NextResponse.json(
              {
                error: LOCKOUT_DISPLAY_MESSAGE,
                code: 'ACCOUNT_LOCKED',
                locked: true,
                lockedUntil: nextState.lockedUntil,
                remainingSeconds: nextState.remainingSeconds,
                failedAttempts: nextState.failedAttempts,
                remainingAttempts: 0,
              },
              { status: 423 }
            );
            attachLoginGuardCookie(lockedRes, emailNormalized, nextState, request);
            return lockedRes;
          }

          const failRes = NextResponse.json(
            {
              error: `Invalid administrator credentials. Please check your email and access key. (${nextState.remainingAttempts} ${
                nextState.remainingAttempts === 1 ? 'attempt' : 'attempts'
              } remaining before 5-minute lockout.)`,
              code: 'INVALID_CREDENTIALS',
              locked: false,
              failedAttempts: nextState.failedAttempts,
              remainingAttempts: nextState.remainingAttempts,
            },
            { status: 401 }
          );
          attachLoginGuardCookie(failRes, emailNormalized, nextState, request);
          return failRes;
        }

        const mailCfg = getMailConfigStatus();
        if (!mailCfg.configured) {
          return NextResponse.json(
            {
              error:
                'SMTP email delivery (SMTP_HOST, SMTP_USER, SMTP_PASS) is not configured in .env.local. 6-digit OTP email verification cannot proceed without SMTP.',
            },
            { status: 503 }
          );
        }

        const otp = generateSixDigitOtp();
        await sendBillingOtpEmail(emailNormalized, otp);

        const { token: challengeToken } = createOtpChallengeToken(emailNormalized, otp);
        const res = NextResponse.json({
          success: true,
          email: emailNormalized,
          expiresInSec: 300,
          message: `A 6-digit verification code has been dispatched to ${emailNormalized}.`,
        });

        res.cookies.set(OTP_COOKIE_NAME, challengeToken, {
          httpOnly: true,
          secure: IS_PROD,
          sameSite: 'lax',
          path: '/',
          maxAge: 300,
        });

        return res;
      });
    }

    if (action === 'verify_otp') {
      const parsed = verifyOtpSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Enter a valid 6-digit OTP.' },
          { status: 400 }
        );
      }

      const challengeCookie = request.cookies.get(OTP_COOKIE_NAME)?.value;
      if (!challengeCookie) {
        return NextResponse.json(
          { error: 'OTP verification session expired or missing. Please request a new code.' },
          { status: 401 }
        );
      }

      const limit = checkAuthRateLimit(`verify:${clientIp}`, 12, 10 * 60 * 1000);
      if (!limit.allowed) {
        return NextResponse.json(
          { error: `Too many verification attempts. Wait ${limit.retryAfterSec}s.` },
          { status: 429 }
        );
      }

      const result = verifyOtpChallengeToken(challengeCookie, parsed.data.otp);
      if (!result.valid || !result.email) {
        const res = NextResponse.json(
          { error: result.error || 'OTP verification failed.' },
          { status: 401 }
        );
        if (result.updatedToken) {
          res.cookies.set(OTP_COOKIE_NAME, result.updatedToken, {
            httpOnly: true,
            secure: IS_PROD,
            sameSite: 'lax',
            path: '/',
            maxAge: 300,
          });
        } else {
          res.cookies.delete(OTP_COOKIE_NAME);
        }
        return res;
      }

      await resetAccountLoginFailures(result.email);

      const { token: sessionToken, session } = createSessionToken(result.email);
      const res = NextResponse.json({
        success: true,
        session,
        message: 'Identity verified. ChittorTech Billing workspace unlocked.',
      });

      res.cookies.delete(OTP_COOKIE_NAME);
      clearLoginGuardCookie(res, request);
      res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60,
      });

      return res;
    }

    return NextResponse.json({ error: 'Unsupported authentication action.' }, { status: 400 });
  } catch (err) {
    console.error('[Billing Auth API Error]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal authentication failure.' },
      { status: 500 }
    );
  }
}
