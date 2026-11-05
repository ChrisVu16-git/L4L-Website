import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toVnd, totals, validateShipping } from '../../shared/commerce.mjs';
import { productView, orderView } from '../utils/commerce.js';
const address = { recipientName:'Nguyễn Văn An', phone:'+84 912 345 678', address:'12 Nguyễn Huệ', ward:'Phường Sài Gòn', city:'TP. Hồ Chí Minh', country:'VN', postalCode:'' };
test('legacy prices convert exactly once and VND records retain their numeric value', () => {
  assert.equal(toVnd(25),625000); assert.equal(toVnd(625000,'VND'),625000);
  assert.equal(productView({price:25}).price,625000);
  const old = {totalPrice:37.5,itemsPrice:25,shippingPrice:10,taxPrice:2.5,orderItems:[{price:25}],isDelivered:true,adminNote:'private'};
  const converted = orderView(old);
  assert.equal(converted.totalPrice,937500); assert.equal(converted.status,'delivered'); assert.equal(converted.adminNote,undefined);
  assert.equal(old.totalPrice,37.5); assert.equal(orderView(converted).totalPrice,937500);
  assert.deepEqual(totals(625000),{itemsPrice:625000,shippingPrice:250000,taxPrice:62500,totalPrice:937500});
});
test('shipping normalizes Vietnamese phone numbers and rejects blank/incomplete addresses', () => {
  const checked = validateShipping(address);
  assert.deepEqual(checked.errors,{}); assert.equal(checked.value.phone,'0912345678'); assert.equal(checked.value.country,'Việt Nam');
  for (const invalid of [{phone:'123'},{address:'   '},{recipientName:''},{ward:''},{city:''},{postalCode:'<invalid>'}]) {
    assert.ok(Object.keys(validateShipping({...address,...invalid}).errors).length);
  }
  assert.ok(Object.keys(validateShipping(null).errors).length);
});
