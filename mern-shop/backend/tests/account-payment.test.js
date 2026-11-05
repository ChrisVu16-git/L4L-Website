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
const envKeys = ['RESEND_API_KEY','SMTP_HOST','SMTP_USER','SMTP_PASS','MAIL_FROM','VNPAY_TMN_CODE','VNPAY_HASH_SECRET','VNPAY_RETURN_URL','VNPAY_USD_TO_VND_RATE'];
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
before(async () => {
  assert.ok(process.env.TEST_MONGO_URI, 'TEST_MONGO_URI is required');
  await mongoose.connect(process.env.TEST_MONGO_URI);
  delete process.env.RESEND_API_KEY;
  for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM']) delete process.env[key];
  Object.assign(process.env, { VNPAY_TMN_CODE: 'TESTCODE', VNPAY_HASH_SECRET: 'fake-hash-secret', VNPAY_RETURN_URL: 'http://localhost:5000/api/orders/vnpay/return', VNPAY_USD_TO_VND_RATE: '25000' });
  mock.method(nodemailer, 'createTransport', () => ({ sendMail: async message => { sent.push(message); throw new Error('Registration must not send email'); } }));
});
after(async () => {
  mock.restoreAll();
  await User.deleteMany({ email });
  if (order) await Order.deleteOne({ _id: order._id });
  if (product) await Product.deleteOne({ _id: product._id });
  for (const [key, value] of Object.entries(originalEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  await mongoose.disconnect();
});

test('signup and login work without mail credentials or confirmed email', async () => {
  const registered = await request(app).post('/api/users/register').send({ name: 'Collector', email: email.toUpperCase(), password, phone: '0912345678' });
  assert.equal(registered.status, 201);
  assert.ok(registered.body.token);
  assert.equal(registered.body.emailVerified, false);
  assert.equal(registered.body.verificationPending, undefined);
  assert.equal(registered.body.password, undefined);
  user = await User.findOne({ email });
  assert.notEqual(user.password, password);
  const loggedIn = await request(app).post('/api/users/login').send({ email, password });
  assert.equal(loggedIn.status, 200); assert.ok(loggedIn.body.token);
  assert.equal((await request(app).post('/api/users/login').send({ email, password: 'wrong' })).status, 401);
  assert.equal((await request(app).post('/api/users/register').send({ name: 'Collector', email, password, phone: '0912345678' })).status, 409);
  assert.equal(sent.length, 0);
});

test('old verification endpoints are disabled and send no email', async () => {
  assert.equal((await request(app).post('/api/users/resend-verification').send({ email })).status, 410);
  assert.equal((await request(app).post('/api/users/verify-email').send({ token: 'a'.repeat(64) })).status, 410);
  assert.equal(sent.length, 0);
});

test('VNPay checkout/return/IPN checks amounts and fulfills concurrent notifications exactly once', async () => {
  user = await User.findOne({ email });
  product = await Product.create({ name: 'Sandbox figure', description: 'Test', price: 625000, currency: 'VND', category: 'Testing', image: 'https://example.test/figure.jpg', countInStock: 5 });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  assert.equal(user.emailVerified, false);
  const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
    orderItems: [{ product: product._id, qty: 1 }],
    shippingAddress: { recipientName: 'Nguyễn Văn An', phone: '0912345678', address: '12 Nguyễn Huệ', ward: 'Phường Sài Gòn', city: 'TP. Hồ Chí Minh', postalCode: '70000', country: 'Việt Nam' },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.totalPrice, 937500);
  order = await Order.findById(created.body._id);
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
  const cancelled = await request(app).get(`/api/orders/vnpay/return?${query({ vnp_ResponseCode: '24', vnp_TransactionStatus: '02' })}`);
  assert.equal(cancelled.status, 303);
  assert.equal(new URL(cancelled.headers.location).pathname, `/product/${product._id}`);
  assert.equal(new URL(cancelled.headers.location).searchParams.get('payment'), 'cancelled');
  const forgedCancel = await request(app).get(`/api/orders/vnpay/return?${query({})}&vnp_ResponseCode=24`);
  assert.equal(forgedCancel.status, 400);
  const failed = await request(app).get(`/api/orders/vnpay/return?${query({ vnp_ResponseCode: '51', vnp_TransactionStatus: '02' })}`);
  assert.equal(new URL(failed.headers.location).pathname, `/order/${order._id}`);
  assert.equal(new URL(failed.headers.location).searchParams.get('payment'), 'failed');
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
