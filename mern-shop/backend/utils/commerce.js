import { toVnd, orderStatus } from './commerce-rules.js';
export function productView(product) {
  const value = product.toObject ? product.toObject() : { ...product };
  return { ...value, price: toVnd(value.price, value.currency), currency: 'VND' };
}
export function orderView(order, admin = false) {
  const value = order.toObject ? order.toObject() : { ...order };
  delete value.guestTokenHash;
  const currency = value.currency;
  for (const field of ['itemsPrice','shippingPrice','taxPrice','totalPrice']) value[field] = toVnd(value[field], currency);
  value.orderItems = value.orderItems.map(item => ({ ...item, price: toVnd(item.price, currency) }));
  value.currency = 'VND'; value.status = orderStatus(value);
  value.version = value.__v || 0;
  if (!admin) delete value.adminNote;
  return value;
}
