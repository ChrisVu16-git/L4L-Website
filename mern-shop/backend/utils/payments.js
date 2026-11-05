import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

export const SANDBOX_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
export function paymentConfig() {
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secret = process.env.VNPAY_HASH_SECRET;
  const rate = Number(process.env.VNPAY_USD_TO_VND_RATE);
  const returnUrl = process.env.VNPAY_RETURN_URL;
  if (!tmnCode || !secret || !Number.isFinite(rate) || rate <= 0 || !returnUrl) {
    const error = new Error('VNPay sandbox is not configured. Set the terminal code, hash secret, return URL and USD-to-VND sandbox rate.');
    error.code = 'PAYMENTS_UNCONFIGURED';
    throw error;
  }
  const url = new URL(returnUrl);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('VNPay return URL must use HTTPS outside localhost');
  return { tmnCode, secret, rate, returnUrl };
}
const encode = value => encodeURIComponent(value).replace(/%20/g, '+');
export function canonicalQuery(params) {
  return Object.keys(params).filter(key => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType').sort().map(key => {
    if (typeof params[key] !== 'string') throw new Error('Duplicate or invalid payment parameter');
    return `${encode(key)}=${encode(params[key])}`;
  }).join('&');
}
export const signPayment = (params, secret) => createHmac('sha512', secret).update(canonicalQuery(params), 'utf8').digest('hex');
export function verifyPayment(params, secret) {
  try {
    if (!/^[a-f0-9]{128}$/i.test(params.vnp_SecureHash)) return false;
    const expected = Buffer.from(signPayment(params, secret), 'hex');
    return timingSafeEqual(expected, Buffer.from(params.vnp_SecureHash, 'hex'));
  } catch { return false; }
}
export function callbackParams(originalUrl) {
  const entries = new URL(originalUrl, 'http://localhost').searchParams;
  const params = {};
  for (const [key, value] of entries) {
    if (!key.startsWith('vnp_') || Object.hasOwn(params, key)) throw new Error('Invalid callback query');
    params[key] = value;
  }
  return params;
}
export function amountVnd(totalUsd, rate) {
  const amount = Math.round(totalUsd * rate);
  if (!Number.isFinite(totalUsd) || totalUsd <= 0 || !Number.isFinite(rate) || rate <= 0 || !Number.isSafeInteger(amount) || amount < 1 || amount * 100 > 999999999999) throw new Error('Order total is outside VNPay amount limits');
  return amount;
}
export const vietnamTime = date => new Date(date.getTime() + 7 * 3600000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
export function checkoutUrl(order, attempt, clientIp, config) {
  const ip = clientIp?.replace(/^::ffff:/, '');
  if (!isIP(ip || '')) throw new Error('Cannot determine customer IP');
  const params = {
    vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(attempt.amountVnd * 100), vnp_CurrCode: 'VND',
    vnp_TxnRef: attempt.reference, vnp_OrderInfo: `Thanh toan L4LStore ${order._id}`,
    vnp_OrderType: 'other', vnp_Locale: 'vn', vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: ip, vnp_CreateDate: vietnamTime(new Date(attempt.createdAt)), vnp_ExpireDate: vietnamTime(new Date(attempt.expiresAt)),
  };
  return `${SANDBOX_URL}?${canonicalQuery(params)}&vnp_SecureHash=${signPayment(params, config.secret)}`;
}
export function matchesAttempt(params, attempt, config) {
  return params.vnp_TmnCode === config.tmnCode && params.vnp_TxnRef === attempt.reference
    && params.vnp_Amount === String(attempt.amountVnd * 100)
    && (!params.vnp_CurrCode || params.vnp_CurrCode === 'VND');
}
export const paymentSucceeded = params => params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00' && /^[1-9][0-9]{0,14}$/.test(params.vnp_TransactionNo || '');
