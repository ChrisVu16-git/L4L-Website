import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, verificationToken, hashToken } from '../utils/identity.js';
import { checkoutParams, validPaidSession, getSandboxStripe } from '../utils/payments.js';

test('email validation normalizes Gmail and rejects malformed addresses', () => {
  assert.equal(normalizeEmail(' Collector.Name+figures@GMAIL.COM '), 'collector.name+figures@gmail.com');
  for (const value of [null, {}, 'x', 'x@@gmail.com', 'x y@gmail.com', '.x@gmail.com', 'x..y@gmail.com']) assert.equal(normalizeEmail(value), null);
  assert.equal(normalizeEmail('hello@example.com'), 'hello@example.com');
});
test('verification tokens are random, hashed, and expire', () => {
  const a = verificationToken(); const b = verificationToken();
  assert.notEqual(a.token, b.token); assert.notEqual(a.hash, a.token);
  assert.equal(hashToken(a.token), a.hash);
  assert.ok(a.expires > new Date() && a.expires < new Date(Date.now() + 31 * 60000));
});
test('sandbox checkout charges the full server total including tax and shipping', () => {
  const order = { _id: 'order123', totalPrice: 37.5, stripeSessionId: 'cs_test_1' };
  const params = checkoutParams(order, 'collector@gmail.com');
  assert.equal(params.line_items[0].price_data.unit_amount, 3750);
  const paid = { id: 'cs_test_1', mode: 'payment', payment_status: 'paid', currency: 'usd', amount_total: 3750, livemode: false, metadata: { orderId: 'order123' } };
  assert.equal(validPaidSession(paid, order), true);
  for (const change of [{ amount_total: 2500 }, { livemode: true }, { id: 'other' }, { payment_status: 'unpaid' }, { currency: 'vnd' }, { metadata: {} }]) assert.equal(validPaidSession({ ...paid, ...change }, order), false);
});
test('live and missing Stripe keys are refused', () => {
  const original = process.env.STRIPE_SECRET_KEY;
  try {
    for (const key of ['', 'sk_live_fake', 'sk_test_placeholder']) {
      process.env.STRIPE_SECRET_KEY = key;
      assert.throws(getSandboxStripe, /test secret key/);
    }
  } finally { if (original === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = original; }
});
