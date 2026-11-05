import nodemailer from 'nodemailer';

export const emailReady = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);

export async function sendVerification(email, token) {
  if (!emailReady()) throw new Error('Email delivery is not configured');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    requireTLS: process.env.SMTP_PORT !== '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  const url = new URL('/verify-email', process.env.CLIENT_URL || 'http://localhost:5173');
  url.searchParams.set('token', token);
  await transport.sendMail({
    from: process.env.MAIL_FROM, to: email,
    subject: 'Confirm your L4LStore email',
    text: `Confirm your L4LStore account: ${url.toString()}\nThis link expires in 30 minutes. If you did not request it, ignore this email.`,
  });
}
