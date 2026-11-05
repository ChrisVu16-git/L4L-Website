import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, verificationToken, hashToken } from '../utils/identity.js';
import { paymentConfig, canonicalQuery, signPayment, verifyPayment, callbackParams, amountVnd, vietnamTime, checkoutUrl, matchesAttempt, paymentSucceeded } from '../utils/payments.js';

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
test('VNPay signing has stable sorting/encoding and matches an independent HMAC fixture', () => {
  const params = { vnp_TmnCode: 'TESTCODE', vnp_OrderInfo: 'Thanh toan L4L+Store', vnp_Amount: '1000000' };
  assert.equal(canonicalQuery(params), 'vnp_Amount=1000000&vnp_OrderInfo=Thanh+toan+L4L%2BStore&vnp_TmnCode=TESTCODE');
  const hash = '0af5c361daef178f7430c456953741b98c5e65d94c5300fc4a05d569e7ce87c2f7b8f25f8dc4c498d7265f96570e0341618881d94df98a515759d681aa889937';
  assert.equal(signPayment(params, 'fixture-secret'), hash);
  assert.equal(verifyPayment({ ...params, vnp_SecureHash: hash }, 'fixture-secret'), true);
  assert.equal(verifyPayment({ ...params, vnp_Amount: '1', vnp_SecureHash: hash }, 'fixture-secret'), false);
  assert.equal(verifyPayment({ ...params, vnp_SecureHash: 'bad' }, 'fixture-secret'), false);
  assert.throws(() => callbackParams('/ipn?vnp_Amount=1&vnp_Amount=2'), /Invalid callback/);
});
test('VNPay sends whole VND totals multiplied by 100 without another FX conversion', () => {
  const amount = amountVnd(937500);
  assert.equal(amount, 937500);
  const attempt = { reference: 'ref123', amountVnd: amount, createdAt: new Date('2026-11-05T00:00:00Z'), expiresAt: new Date('2026-11-05T00:15:00Z') };
  const config = { tmnCode: 'TESTCODE', secret: 'fixture-secret', returnUrl: 'http://localhost:5000/api/orders/vnpay/return' };
  const url = new URL(checkoutUrl({ _id: 'order123' }, attempt, '::ffff:127.0.0.1', config));
  assert.equal(url.origin, 'https://sandbox.vnpayment.vn');
  assert.equal(url.searchParams.get('vnp_Amount'), '93750000');
  assert.equal(url.searchParams.get('vnp_CurrCode'), 'VND');
  assert.equal(vietnamTime(attempt.createdAt), '20261105070000');
  assert.equal(url.searchParams.get('vnp_ExpireDate'), '20261105071500');
  assert.equal(verifyPayment(Object.fromEntries(url.searchParams), config.secret), true);
  const paid = { vnp_TmnCode: config.tmnCode, vnp_TxnRef: attempt.reference, vnp_Amount: '93750000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '123456' };
  assert.equal(matchesAttempt(paid, attempt, config), true);
  assert.equal(paymentSucceeded(paid), true);
  for (const change of [{ vnp_Amount: '3750' }, { vnp_TmnCode: 'OTHER' }, { vnp_TxnRef: 'other' }, { vnp_CurrCode: 'USD' }]) assert.equal(matchesAttempt({ ...paid, ...change }, attempt, config), false);
  for (const change of [{ vnp_ResponseCode: '24' }, { vnp_TransactionStatus: '01' }, { vnp_TransactionNo: '0' }]) assert.equal(paymentSucceeded({ ...paid, ...change }), false);
  for (const args of [[0], [37.5], [Infinity], [1e15]]) assert.throws(() => amountVnd(...args));
});
test('VNPay refuses unconfigured merchant settings', () => {
  const keys = ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_RETURN_URL', 'VNPAY_USD_TO_VND_RATE'];
  const original = keys.map(k => process.env[k]);
  try {
    keys.forEach(k => delete process.env[k]);
    assert.throws(paymentConfig, /not configured/);
    Object.assign(process.env, { VNPAY_TMN_CODE: 'TESTCODE', VNPAY_HASH_SECRET: 'fake', VNPAY_RETURN_URL: 'http://localhost:5000/api/orders/vnpay/return', VNPAY_USD_TO_VND_RATE: '25000' });
    assert.equal(paymentConfig().tmnCode, 'TESTCODE');
  } finally { keys.forEach((k,i) => { if (original[i] === undefined) delete process.env[k]; else process.env[k] = original[i]; }); }
});
