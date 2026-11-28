import crypto from 'crypto';
import nodemailer from 'nodemailer';

export interface MailConfigStatus {
  configured: boolean;
  from: string;
}

export function getMailConfigStatus(): MailConfigStatus {
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || user || 'business@chittortech.in';
  return {
    configured: Boolean(process.env.SMTP_HOST && user && pass),
    from,
  };
}

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtpout.secureserver.net';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    throw new Error('SMTP credentials (SMTP_USER / SMTP_PASS) are not configured in .env.local.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendBillingOtpEmail(recipientEmail: string, otp: string): Promise<void> {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'business@chittortech.in';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChittorTech Billing 2FA Verification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F8FC; margin: 0; padding: 24px; color: #334155;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 8px 24px rgba(15,23,42,0.06);">
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 26px 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; background: #2563EB; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 10px;">ChittorTech Billing Terminal</div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Two-Factor Security Code</h1>
    </div>
    <div style="padding: 28px 24px; text-align: center;">
      <p style="font-size: 13.5px; color: #475569; line-height: 1.6; margin: 0 0 16px;">
        A sign-in request was initiated on <strong>ChittorTech Billing Software</strong>. Enter this 6-digit verification code to unlock your billing session:
      </p>
      <div style="background: #EAF3FF; border: 2px dashed #2563EB; border-radius: 12px; padding: 16px 22px; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; display: inline-block; margin: 10px 0 16px; font-family: 'Courier New', monospace;">
        ${otp}
      </div>
      <div style="font-size: 12px; color: #dc2626; font-weight: 700; margin-bottom: 18px;">
        Valid for 5 minutes only • Do not share this code
      </div>
      <div style="font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 14px; text-align: left;">
        <strong>Security Notice:</strong> This isolated 2FA session protects ChittorTech, Mewari Achaar, and Visit Chittorgarh financial records.
      </div>
    </div>
    <div style="background: #F1F6FC; padding: 14px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #E2E8F0;">
      ChittorTech Billing Software &bull; Dispatched via ${from}
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"ChittorTech Billing Security" <${from}>`,
    to: recipientEmail,
    subject: `ChittorTech Billing 2FA Code: ${otp}`,
    html,
  });
}

export function generateSecureId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

