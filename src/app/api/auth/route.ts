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
import { sendBillingOtpEmail, getMailConfigStatus } from '@/lib/mail/mailer';

const sendOtpSchema = z.object({
  action: z.literal('verify_passcode_send_otp'),
  email: z.string().email('Please enter a valid ChittorTech admin email.'),
  passcode: z.string().min(1, 'Admin passcode is required.'),
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

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'local-client';

    if (action === 'verify_passcode_send_otp') {
      const parsed = sendOtpSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Invalid credentials payload.' },
          { status: 400 }
        );
      }

      const emailNormalized = parsed.data.email.trim().toLowerCase();
      const limit = checkAuthRateLimit(`send:${clientIp}:${emailNormalized}`, 8, 10 * 60 * 1000);
      if (!limit.allowed) {
        return NextResponse.json(
          { error: `Too many OTP requests. Please wait ${limit.retryAfterSec}s before retrying.` },
          { status: 429 }
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

      if (!isAuthorizedAdminEmail(emailNormalized)) {
        return NextResponse.json(
          { error: 'This email address is not on the authorized ChittorTech administrator list.' },
          { status: 403 }
        );
      }

      if (!verifyAdminPasscode(parsed.data.passcode)) {
        return NextResponse.json(
          { error: 'Incorrect administrator access key.' },
          { status: 401 }
        );
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

      const { token: sessionToken, session } = createSessionToken(result.email);
      const res = NextResponse.json({
        success: true,
        session,
        message: 'Identity verified. ChittorTech Billing workspace unlocked.',
      });

      res.cookies.delete(OTP_COOKIE_NAME);
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
