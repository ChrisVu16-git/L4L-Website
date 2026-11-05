import nodemailer from 'nodemailer';
import { createHash } from 'node:crypto';

const present = name => typeof process.env[name] === 'string' && Boolean(process.env[name].trim());
export const emailReady = () => present('MAIL_FROM') && (
  present('RESEND_API_KEY') || (present('SMTP_HOST') && present('SMTP_USER') && present('SMTP_PASS'))
);

export async function sendVerification(email, token) {
  if (!emailReady()) throw new Error('Email delivery is not configured');
  const url = new URL('/verify-email', process.env.CLIENT_URL || 'http://localhost:5173');
  url.searchParams.set('token', token);
  const message = {
    from: process.env.MAIL_FROM, to: email,
    subject: 'Confirm your L4LStore email',
    text: `Confirm your L4LStore account: ${url.toString()}\nThis link expires in 30 minutes. If you did not request it, ignore this email.`,
  };
  if (present('RESEND_API_KEY')) {
    // HTTPS works on hosts whose free plans block outbound SMTP ports.
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `verify-${createHash('sha256').update(token).digest('hex')}`,
      },
      body: JSON.stringify({ ...message, to: [email] }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.id || data.error) {
      const error = new Error('Email provider rejected delivery');
      error.code = 'EMAIL_DELIVERY_FAILED';
      throw error;
    }
    return;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    requireTLS: process.env.SMTP_PORT !== '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  await transport.sendMail(message);
}
