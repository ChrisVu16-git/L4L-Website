import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const hashGuestToken = token => createHash('sha256').update(token).digest('hex');
export function newGuestAccess() {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashGuestToken(token) };
}
export function canAccessOrder(req, order) {
  if (req.user?.isAdmin) return true;
  if (!order.isGuest) return Boolean(req.user && (order.user?._id || order.user)?.toString() === req.user._id.toString());
  const token = req.get('X-Guest-Order-Token');
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !order.guestTokenHash) return false;
  const actual = Buffer.from(hashGuestToken(token), 'hex');
  const expected = Buffer.from(order.guestTokenHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
