import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { emailReady, sendVerification } from '../utils/email.js';

const keys = ['SMTP_HOST','SMTP_USER','SMTP_PASS','SMTP_PORT','MAIL_FROM','RESEND_API_KEY','CLIENT_URL'];
async function configured(values, work) {
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  keys.forEach(key => delete process.env[key]);
  Object.assign(process.env, values);
  try { await work(); } finally {
    mock.restoreAll();
    for (const [key,value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}
test('no delivery credentials is reported as unconfigured', async () => {
  await configured({}, async () => {
    assert.equal(Boolean(emailReady()), false);
    await assert.rejects(sendVerification('collector@example.test', 'token'), /not configured/);
  });
});
test('HTTPS mail sends a confirmation link and requires provider acknowledgement', async () => {
  await configured({ RESEND_API_KEY: 'fake-key', MAIL_FROM: 'L4L <sender@example.test>', CLIENT_URL: 'https://shop.example.test' }, async () => {
    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ id: 'email-fixture' }) }; });
    assert.equal(Boolean(emailReady()), true);
    await sendVerification('collector@gmail.com', 'private-token');
    const { url, options } = calls[0];
    const message = JSON.parse(options.body);
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers.Authorization, 'Bearer fake-key');
    assert.deepEqual(message.to, ['collector@gmail.com']);
    assert.match(message.text, /https:\/\/shop.example.test\/verify-email\?token=private-token/);
    assert.ok(!options.headers['Idempotency-Key'].includes('private-token'));
  });
});
test('provider rejection or an invalid success response is not treated as sent', async () => {
  await configured({ RESEND_API_KEY: 'fake-key', MAIL_FROM: 'sender@example.test' }, async () => {
    const call = mock.method(globalThis, 'fetch', async () => ({ ok: false, json: async () => ({ message: 'Unauthorized' }) }));
    await assert.rejects(sendVerification('collector@example.test', 'token'), /rejected/);
    call.mock.mockImplementation(async () => ({ ok: true, json: async () => ({}) }));
    await assert.rejects(sendVerification('collector@example.test', 'token'), /rejected/);
  });
});
test('SMTP remains available on hosts that allow outbound SMTP', async () => {
  await configured({ SMTP_HOST: 'smtp.example.test', SMTP_USER: 'sender', SMTP_PASS: 'fake', MAIL_FROM: 'sender@example.test' }, async () => {
    let delivered;
    mock.method(nodemailer, 'createTransport', () => ({ sendMail: async message => { delivered = message; } }));
    await sendVerification('collector@example.test', 'token');
    assert.equal(delivered.to, 'collector@example.test');
  });
});
