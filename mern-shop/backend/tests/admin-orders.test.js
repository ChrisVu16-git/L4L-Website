import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { signPayment } from '../utils/payments.js';
let admin, customer, product, order, legacy, cancelledOrder;
const address={recipientName:'Nguyễn Văn An',phone:'0912345678',address:'12 Nguyễn Huệ',ward:'Phường Sài Gòn',city:'TP. Hồ Chí Minh',postalCode:'70000',country:'Việt Nam'};
const auth = user => ({Authorization:`Bearer ${jwt.sign({id:user._id},process.env.JWT_SECRET)}`});
before(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI);
  const suffix=`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  admin=await User.create({name:'Admin',email:`admin-${suffix}@example.test`,password:'password123',isAdmin:true});
  customer=await User.create({name:'Customer',email:`customer-${suffix}@example.test`,password:'password123'});
  product=await Product.create({currency:'VND',name:'Figure',description:'Test figure',price:625000,category:'Testing',image:'https://example.test/figure.jpg',countInStock:5});
  legacy=await Product.create({name:'Legacy figure',description:'Old USD figure',price:25,category:'Testing',image:'https://example.test/legacy.jpg',countInStock:5});
});
after(async () => {
  if(order)await Order.deleteOne({_id:order._id});
  if(cancelledOrder)await Order.deleteOne({_id:cancelledOrder._id});
  await Product.deleteMany({_id:{$in:[product?._id,legacy?._id].filter(Boolean)}});
  await User.deleteMany({_id:{$in:[admin?._id,customer?._id].filter(Boolean)}});
  await mongoose.disconnect();
});
test('legacy catalogue conversion preserves raw USD values; new orders use server VND totals',async()=>{
  const old=await request(app).get(`/api/products/${legacy._id}`);
  assert.equal(old.body.price,625000);assert.equal(old.body.currency,'VND');assert.equal((await Product.findById(legacy._id)).price,25);
  const editedLegacy=await request(app).put(`/api/products/${legacy._id}`).set(auth(admin)).send({name:'Mô hình cũ'});
  assert.equal(editedLegacy.status,200);assert.equal(editedLegacy.body.price,625000);
  assert.equal((await Product.findById(legacy._id)).legacyPriceUsd,25);
  assert.equal((await request(app).get(`/api/products/${legacy._id}`)).body.price,625000);
  const invalid=await request(app).post('/api/orders').set(auth(customer)).send({orderItems:[{product:product._id,qty:1}],shippingAddress:{...address,phone:'12'}});
  assert.equal(invalid.status,400);assert.ok(invalid.body.errors.phone);
  const created=await request(app).post('/api/orders').set(auth(customer)).send({orderItems:[{product:product._id,qty:1,price:1}],shippingAddress:address});
  assert.equal(created.status,201);assert.equal(created.body.currency,'VND');assert.equal(created.body.totalPrice,937500);assert.equal(created.body.status,'placed');
  order=await Order.findById(created.body._id);
});
test('admin order edits enforce authorization, stale versions and controlled transitions',async()=>{
  const endpoint=`/api/orders/${order._id}`;
  const update=(body,user=admin)=>request(app).put(endpoint).set(auth(user)).send(body);
  assert.equal((await update({version:0,status:'processing'},customer)).status,403);
  assert.equal((await update({version:0,isPaid:true})).status,400);
  let result=await update({version:0,status:'processing',shippingAddress:{...address,address:'34 Nguyễn Huệ'},adminNote:'Nội bộ'});
  assert.equal(result.status,200);assert.equal(result.body.status,'processing');
  assert.equal((await update({version:0,status:'cancelled'})).status,409);
  assert.equal((await update({version:result.body.version,status:'shipping',trackingNumber:'TEST123'})).status,400);
  const customerView=await request(app).get(endpoint).set(auth(customer));
  assert.equal(customerView.body.adminNote,undefined);assert.equal(customerView.body.shippingAddress.address,'34 Nguyễn Huệ');
  await Order.updateOne({_id:order._id},{$set:{isPaid:true,paidAt:new Date()}});
  result=await update({version:result.body.version,status:'shipping',trackingNumber:'TEST123'});
  assert.equal(result.status,200);assert.equal(result.body.status,'shipping');
  assert.equal((await update({version:result.body.version,shippingAddress:address})).status,400);
  result=await update({version:result.body.version,status:'delivered'});
  assert.equal(result.status,200);assert.equal(result.body.isDelivered,true);assert.ok(result.body.deliveredAt);
  const visible=await request(app).get('/api/orders/myorders').set(auth(customer));
  assert.equal(visible.status,200);assert.equal(visible.body.find(o=>o._id===String(order._id)).status,'delivered');
});

test('cancelled unpaid orders cannot check out or fulfill a late successful IPN',async()=>{
  const keys=['VNPAY_TMN_CODE','VNPAY_HASH_SECRET','VNPAY_RETURN_URL'];
  const original=keys.map(key=>process.env[key]);
  Object.assign(process.env,{VNPAY_TMN_CODE:'TESTCODE',VNPAY_HASH_SECRET:'fixture',VNPAY_RETURN_URL:'http://localhost:5000/api/orders/vnpay/return'});
  try {
    cancelledOrder=await Order.create({currency:'VND',status:'placed',user:customer._id,orderItems:[{product:product._id,name:'Figure',image:product.image,price:625000,qty:1}],shippingAddress:address,totalPrice:937500,itemsPrice:625000,shippingPrice:250000,taxPrice:62500,vnpayAttempts:[{reference:'cancelled-fixture',amountVnd:937500,createdAt:new Date(),expiresAt:new Date(Date.now()+900000)}]});
    const cancelled=await request(app).put(`/api/orders/${cancelledOrder._id}`).set(auth(admin)).send({version:0,status:'cancelled'});
    assert.equal(cancelled.status,200);
    assert.equal((await request(app).post(`/api/orders/${cancelledOrder._id}/checkout`).set(auth(customer))).status,409);
    const values={vnp_TmnCode:'TESTCODE',vnp_TxnRef:'cancelled-fixture',vnp_Amount:'93750000',vnp_ResponseCode:'00',vnp_TransactionStatus:'00',vnp_TransactionNo:'1234567'};
    const query=new URLSearchParams({...values,vnp_SecureHash:signPayment(values,'fixture')});
    const response=await request(app).get(`/api/orders/vnpay/ipn?${query}`);
    assert.equal(response.body.RspCode,'99');assert.equal((await Order.findById(cancelledOrder._id)).isPaid,false);
  } finally {keys.forEach((key,i)=>{if(original[i]===undefined)delete process.env[key];else process.env[key]=original[i];});}
});

test('old price forms cannot overwrite VND prices without the current client marker',async()=>{
  const endpoint=`/api/products/${product._id}`;
  const blocked=await request(app).put(endpoint).set(auth(admin)).send({price:10,currency:'VND'});
  assert.equal(blocked.status,409);assert.equal((await Product.findById(product._id)).price,625000);
  const accepted=await request(app).put(endpoint).set(auth(admin)).set('X-L4L-Client-Currency','VND').send({price:625000,currency:'VND'});
  assert.equal(accepted.status,200);
});
