// Keep the frontend/backend copies aligned: each hosting service builds from its own root.
// Fixed, user-approved conversion for pre-VND records; never a live FX rate.
export const LEGACY_USD_TO_VND = 25000;
export function toVnd(amount, currency) {
  const value = Math.round(Number(amount) * (currency === 'VND' ? 1 : LEGACY_USD_TO_VND));
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Số tiền không hợp lệ.');
  return value;
}
export function totals(itemsPrice) {
  const shippingPrice = itemsPrice > 2500000 ? 0 : itemsPrice > 0 ? 250000 : 0;
  const taxPrice = Math.round(itemsPrice * 0.1);
  return { itemsPrice, shippingPrice, taxPrice, totalPrice: itemsPrice + shippingPrice + taxPrice };
}
export const statusLabels = { placed: 'Đã đặt hàng', processing: 'Đang xử lý', shipping: 'Đang giao hàng', delivered: 'Đã giao hàng', cancelled: 'Đã hủy' };
export const orderStatus = order => order.status || (order.isDelivered ? 'delivered' : 'placed');
const clean = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
export function validateShipping(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const value = Object.fromEntries(['recipientName','phone','address','ward','city','postalCode','country'].map(key => [key, clean(source[key])]));
  value.phone = value.phone.replace(/[\s.()-]/g, '').replace(/^\+84/, '0');
  if (/^(vn|việt nam|viet nam|vietnam)$/i.test(value.country)) value.country = 'Việt Nam';
  const errors = {};
  for (const [field,min,max,label] of [['recipientName',2,100,'họ tên người nhận'],['address',8,200,'số nhà và tên đường'],['ward',2,100,'phường/xã'],['city',2,100,'tỉnh/thành phố'],['country',2,80,'quốc gia']]) {
    if (value[field].length < min || value[field].length > max || !/[\p{L}]/u.test(value[field]) || /[<>\x00-\x1f]/.test(value[field])) errors[field] = `Vui lòng nhập ${label} hợp lệ (${min}–${max} ký tự).`;
  }
  const phoneValid = value.country === 'Việt Nam' ? /^0[35789]\d{8}$/.test(value.phone) : /^\+?\d{9,15}$/.test(value.phone);
  if (!phoneValid) errors.phone = 'Vui lòng nhập số điện thoại hợp lệ, ví dụ 0912345678.';
  if (value.postalCode && !/^[A-Za-z0-9 -]{3,10}$/.test(value.postalCode)) errors.postalCode = 'Mã bưu chính cần có 3–10 ký tự chữ hoặc số.';
  return { value, errors };
}
