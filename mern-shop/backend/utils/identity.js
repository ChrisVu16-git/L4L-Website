import { randomBytes, createHash } from 'node:crypto';
export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const [local, domain] = email.split('@');
  if (local.length > 64) return null;
  // Gmail supports dots and plus tags, but not arbitrary local-part symbols.
  if (domain === 'gmail.com' && !/^[a-z0-9]+(?:\.[a-z0-9]+)*(?:\+[a-z0-9._-]+)?$/.test(local)) return null;
  return email;
}
export const hashToken = token => createHash('sha256').update(token).digest('hex');
export function verificationToken() {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashToken(token), expires: new Date(Date.now() + 30 * 60 * 1000) };
}
