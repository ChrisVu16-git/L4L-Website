import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import nodemailer from 'nodemailer';
import { signPayment } from '../utils/payments.js';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `collector-${suffix}@example.com`;
const password = 'TestPassword123!';
const sent = [];
let user, product, order;
let failEmail = false;
const failedEmail = `failed-${suffix}@example.com`;
const missingEmail = `missing-${suffix}@example.com`;
const envKeys = ['RESEND_API_KEY','SMTP_HOST','SMTP_USER','SMTP_PASS','MAIL_FROM','VNPAY_TMN_CODE','VNPAY_HASH_SECRET','VNPAY_RETURN_URL','VNPAY_USD_TO_VND_RATE'];
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
before(async () => {
  assert.ok(process.env.TEST_MONGO_URI, 'TEST_MONGO_URI is required');
  await mongoose.connect(process.env.TEST_MONGO_URI);
  delete process.env.RESEND_API_KEY;
  Object.assign(process.env, { SMTP_HOST: 'smtp.example.test', SMTP_USER: 'test', SMTP_PASS: 'fake', MAIL_FROM: 'L4LStore <test@example.test>', VNPAY_TMN_CODE: 'TESTCODE', VNPAY_HASH_SECRET: 'fake-hash-secret', VNPAY_RETURN_URL: 'http://localhost:5000/api/orders/vnpay/return', VNPAY_USD_TO_VND_RATE: '25000' });
  mock.method(nodemailer, 'createTransport', () => ({ sendMail: async message => { if (failEmail) throw new Error('Fixture delivery failure'); sent.push(message); return {}; } }));
});
after(async () => {
  mock.restoreAll();
  await User.deleteMany({ email: { $in: [email, failedEmail, missingEmail] } });
  if (order) await Order.deleteOne({ _id: order._id });
  if (product) await Product.deleteOne({ _id: product._id });
  for (const [key, value] of Object.entries(originalEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  await mongoose.disconnect();
});

test('signup requires mailbox proof, expiry and resend, then allows login', async () => {
  const registered = await request(app).post('/api/users/register').send({ name: 'Collector', email: email.toUpperCase(), password });
  assert.equal(registered.body.verificationPending, true);
  assert.equal(registered.status, 201); assert.equal(registered.body.token, undefined);
  assert.equal(sent.length, 1); assert.equal(sent[0].to, email);
  const token = new URL(sent[0].text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');
  user = await User.findOne({ email }).select('+verificationHash');
  assert.notEqual(user.verificationHash, token);
  const blocked = await request(app).post('/api/users/login').send({ email, password });
  assert.equal(blocked.status, 403);
  await User.updateOne({ _id: user._id }, { verificationExpires: new Date(0), verificationSentAt: new Date(0) });
  assert.equal((await request(app).post('/api/users/verify-email').send({ token })).status, 400);
  assert.equal((await request(app).post('/api/users/resend-verification').send({ email })).status, 202);
  assert.equal(sent.length, 2);
  const replacement = new URL(sent[1].text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');
  assert.notEqual(token, replacement);
  assert.equal((await request(app).post('/api/users/verify-email').send({ token: replacement })).status, 200);
  assert.equal((await request(app).post('/api/users/verify-email').send({ token: replacement })).status, 400);
  const loggedIn = await request(app).post('/api/users/login').send({ email, password });
  assert.equal(loggedIn.status, 200); assert.ok(loggedIn.body.token);
  assert.equal(loggedIn.body.verificationHash, undefined);
});

test('missing mail config does not create an account or expose resend state', async () => {
  const sender = process.env.MAIL_FROM;
  delete process.env.MAIL_FROM;
  try {
    const response = await request(app).post('/api/users/register').send({ name: 'Collector', email: missingEmail, password });
    assert.equal(response.status, 503);
    assert.equal(response.body.code, 'EMAIL_NOT_CONFIGURED');
    assert.equal(response.body.verificationPending, undefined);
    assert.equal(await User.exists({ email: missingEmail }), null);
  } finally { process.env.MAIL_FROM = sender; }
});

test('delivery failure after creation exposes pending state and allows immediate retry', async () => {
  failEmail = true;
  let response;
  try { response = await request(app).post('/api/users/register').send({ name: 'Collector', email: failedEmail, password }); }
  finally { failEmail = false; }
  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'EMAIL_DELIVERY_FAILED');
  assert.equal(response.body.verificationPending, true);
  assert.ok(await User.exists({ email: failedEmail }));
  const retried = await request(app).post('/api/users/resend-verification').send({ email: failedEmail });
  assert.equal(retried.status, 202);
  assert.equal(sent.at(-1).to, failedEmail);
});

test('VNPay checkout/return/IPN checks amounts and fulfills concurrent notifications exactly once', async () => {
  user = await User.findOne({ email });
  product = await Product.create({ name: 'Sandbox figure', description: 'Test', price: 25, category: 'Testing', image: 'https://example.test/figure.jpg', countInStock: 5 });
  order = await Order.create({ user: user._id, orderItems: [{ product: product._id, name: product.name, image: product.image, price: 25, qty: 1 }], shippingAddress: { address: 'Test', city: 'Test', postalCode: '10000', country: 'VN' }, paymentMethod: 'vnpay', itemsPrice: 25, shippingPrice: 10, taxPrice: 2.5, totalPrice: 37.5 });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  const checkout = () => request(app).post(`/api/orders/${order._id}/checkout`).set('Authorization', `Bearer ${token}`).send({ amount: 1 });
  const quotes = await Promise.all([checkout(), checkout()]);
  assert.deepEqual(quotes.map(q => q.status), [200,200]);
  assert.equal(quotes[0].body.amountVnd, 937500);
  const reference = new URL(quotes[0].body.url).searchParams.get('vnp_TxnRef');
  assert.equal(new URL(quotes[1].body.url).searchParams.get('vnp_TxnRef'), reference);
  assert.equal((await Order.findById(order._id)).vnpayAttempts.length, 1);
  const params = { vnp_TxnRef: reference, vnp_Amount: '93750000', vnp_TmnCode: process.env.VNPAY_TMN_CODE, vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '12345678' };
  const query = changes => { const values = { ...params, ...changes }; return new URLSearchParams({ ...values, vnp_SecureHash: signPayment(values, process.env.VNPAY_HASH_SECRET) }).toString(); };
  const deliver = (changes = {}) => request(app).get(`/api/orders/vnpay/ipn?${query(changes)}`);
  assert.equal((await request(app).get('/api/orders/vnpay/ipn?vnp_SecureHash=bad')).body.RspCode, '97');
  assert.equal((await deliver({ vnp_Amount: '100' })).body.RspCode, '04');
  assert.equal((await deliver({ vnp_TxnRef: 'unknown' })).body.RspCode, '01');
  assert.equal((await deliver({ vnp_ResponseCode: '24', vnp_TransactionStatus: '02' })).body.RspCode, '00');
  const retry = await checkout();
  assert.equal(retry.status, 200);
  assert.notEqual(new URL(retry.body.url).searchParams.get('vnp_TxnRef'), reference);
  assert.equal((await Order.findById(order._id)).vnpayAttempts.length, 2);
  assert.equal((await deliver({ vnp_TmnCode: 'OTHER' })).body.RspCode, '97');
  assert.equal((await request(app).get('/api/orders/vnpay/return?vnp_SecureHash=bad')).status, 400);
  const returned = await request(app).get(`/api/orders/vnpay/return?${query({})}`);
  assert.equal(returned.status, 303); assert.match(returned.headers.location, /payment=pending/);
  assert.equal((await Order.findById(order._id)).isPaid, false);
  assert.equal((await Product.findById(product._id)).countInStock, 5);
  const duplicates = await Promise.all([deliver(), deliver()]);
  assert.deepEqual(duplicates.map(r => r.body.RspCode).sort(), ['00','02']);
  assert.equal((await Order.findById(order._id)).isPaid, true);
  assert.equal((await Product.findById(product._id)).countInStock, 4);
  assert.equal((await deliver()).body.RspCode, '02');
  assert.equal((await request(app).post('/api/orders/webhook').send({})).status, 404);
});

test('checkout rejects bad quantities, malformed order IDs, and unconfigured payments', async () => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  const auth = { Authorization: `Bearer ${token}` };
  const response = await request(app).post('/api/orders').set(auth).send({ orderItems: [{ product: product._id, qty: -1 }], shippingAddress: { address: 'Test', city: 'Test', postalCode: '1', country: 'VN' } });
  assert.equal(response.status, 400);
  assert.equal((await request(app).get('/api/orders/not-an-id').set(auth)).status, 400);
  delete process.env.VNPAY_HASH_SECRET;
  assert.equal((await request(app).post(`/api/orders/${order._id}/checkout`).set(auth)).status, 503);
});
