import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
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
const envKeys = ['SMTP_HOST','SMTP_USER','SMTP_PASS','MAIL_FROM','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'];
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
before(async () => {
  assert.ok(process.env.TEST_MONGO_URI, 'TEST_MONGO_URI is required');
  await mongoose.connect(process.env.TEST_MONGO_URI);
  Object.assign(process.env, { SMTP_HOST: 'smtp.example.test', SMTP_USER: 'test', SMTP_PASS: 'fake', MAIL_FROM: 'L4LStore <test@example.test>', STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_fake' });
  mock.method(nodemailer, 'createTransport', () => ({ sendMail: async message => { sent.push(message); return {}; } }));
});
after(async () => {
  mock.restoreAll();
  await User.deleteMany({ email });
  if (order) await Order.deleteOne({ _id: order._id });
  if (product) await Product.deleteOne({ _id: product._id });
  for (const [key, value] of Object.entries(originalEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  await mongoose.disconnect();
});

test('signup requires mailbox proof, expiry and resend, then allows login', async () => {
  const registered = await request(app).post('/api/users/register').send({ name: 'Collector', email: email.toUpperCase(), password });
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

test('signed sandbox webhook fulfills exactly once; mismatches and failed signatures do not pay', async () => {
  user = await User.findOne({ email });
  product = await Product.create({ name: 'Sandbox figure', description: 'Test', price: 25, category: 'Testing', image: 'https://example.test/figure.jpg', countInStock: 5 });
  order = await Order.create({ user: user._id, orderItems: [{ product: product._id, name: product.name, image: product.image, price: 25, qty: 1 }], shippingAddress: { address: 'Test', city: 'Test', postalCode: '10000', country: 'VN' }, paymentMethod: 'stripe', itemsPrice: 25, shippingPrice: 10, taxPrice: 2.5, totalPrice: 37.5, stripeSessionId: 'cs_test_fixture' });
  const stripe = new Stripe('sk_test_fake');
  const session = { id: 'cs_test_fixture', mode: 'payment', payment_status: 'paid', currency: 'usd', amount_total: 3750, livemode: false, metadata: { orderId: String(order._id) }, payment_intent: 'pi_test_fixture' };
  const deliver = async (changes = {}, eventChanges = {}) => {
    const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', livemode: false, data: { object: { ...session, ...changes } }, ...eventChanges });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    return request(app).post('/api/orders/webhook').set('Content-Type','application/json').set('stripe-signature', signature).send(payload);
  };
  assert.equal((await request(app).post('/api/orders/webhook').set('Content-Type','application/json').send('{}')).status, 400);
  assert.equal((await deliver({ payment_status: 'unpaid' })).status, 200);
  assert.equal((await deliver({}, { livemode: true })).status, 200);
  assert.equal((await deliver({ amount_total: 2500 })).status, 500);
  assert.equal((await Order.findById(order._id)).isPaid, false);
  const results = await Promise.all([deliver(), deliver()]);
  assert.deepEqual(results.map(r => r.status), [200, 200]);
  assert.equal((await Order.findById(order._id)).isPaid, true);
  assert.equal((await Product.findById(product._id)).countInStock, 4);
  assert.equal((await deliver()).status, 200);
  assert.equal((await Product.findById(product._id)).countInStock, 4);
});

test('checkout rejects bad quantities, malformed order IDs, and unconfigured payments', async () => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  const auth = { Authorization: `Bearer ${token}` };
  const response = await request(app).post('/api/orders').set(auth).send({ orderItems: [{ product: product._id, qty: -1 }], shippingAddress: { address: 'Test', city: 'Test', postalCode: '1', country: 'VN' } });
  assert.equal(response.status, 400);
  assert.equal((await request(app).get('/api/orders/not-an-id').set(auth)).status, 400);
  delete process.env.STRIPE_SECRET_KEY;
  assert.equal((await request(app).post(`/api/orders/${order._id}/checkout`).set(auth)).status, 503);
});
