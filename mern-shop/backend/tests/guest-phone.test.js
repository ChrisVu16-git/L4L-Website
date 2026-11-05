import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { signPayment } from '../utils/payments.js';
let owner, other, admin, product, guestOrder;
let accessToken;
const suffix=`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const emails=[];
const address={recipientName:'Nguyễn Văn An',phone:'0981234567',address:'12 Nguyễn Huệ',ward:'Phường Sài Gòn',city:'TP. Hồ Chí Minh',country:'Việt Nam'};
const auth=user=>({Authorization:`Bearer ${jwt.sign({id:user._id},process.env.JWT_SECRET)}`});
const envKeys=['VNPAY_TMN_CODE','VNPAY_HASH_SECRET','VNPAY_RETURN_URL'];
const original=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
before(async()=>{
  await mongoose.connect(process.env.TEST_MONGO_URI);await User.init();
  const make=async(label,extra={})=>{const email=`${label}-${suffix}@example.test`;emails.push(email);return User.create({name:label,email,password:'password123',...extra});};
  owner=await make('phone-owner',{phone:'0981234567'});other=await make('phone-other');admin=await make('phone-admin',{isAdmin:true});
  product=await Product.create({name:'Guest figure',description:'Guest checkout fixture',currency:'VND',price:625000,category:'Testing',image:'https://example.test/figure.jpg',countInStock:5});
  Object.assign(process.env,{VNPAY_TMN_CODE:'TESTCODE',VNPAY_HASH_SECRET:'guest-fixture',VNPAY_RETURN_URL:'http://localhost:5000/api/orders/vnpay/return'});
});
after(async()=>{
  if(guestOrder)await Order.deleteOne({_id:guestOrder._id});
  if(product)await Product.deleteOne({_id:product._id});
  await User.deleteMany({email:{$in:emails}});
  for(const[k,v]of Object.entries(original)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
  await mongoose.disconnect();
});
test('guest requires a valid phone and receives a private receipt without creating/linking an account',async()=>{
  const body={orderItems:[{product:product._id,qty:1}],shippingAddress:address};
  const invalid=await request(app).post('/api/orders').send({...body,shippingAddress:{...address,phone:'123'}});
  assert.equal(invalid.status,400);assert.ok(invalid.body.errors.phone);
  const created=await request(app).post('/api/orders').send(body);
  assert.equal(created.status,201);assert.equal(created.body.isGuest,true);assert.equal(created.body.user,undefined);assert.equal(created.body.totalPrice,937500);
  assert.match(created.body.guestAccessToken,/^[a-f0-9]{64}$/);assert.equal(created.body.guestTokenHash,undefined);
  accessToken=created.body.guestAccessToken;guestOrder=await Order.findById(created.body._id).select('+guestTokenHash');
  assert.notEqual(guestOrder.guestTokenHash,accessToken);assert.ok(guestOrder.guestTokenHash);
});
test('guest receipt and checkout cannot be accessed by phone, order ID, wrong token or another account',async()=>{
  const path=`/api/orders/${guestOrder._id}`;
  assert.equal((await request(app).get(path)).status,403);
  assert.equal((await request(app).get(path).set('X-Guest-Order-Token','a'.repeat(64))).status,403);
  assert.equal((await request(app).get(path).set(auth(owner))).status,403);
  assert.equal((await request(app).post(`${path}/checkout`)).status,403);
  const viewed=await request(app).get(path).set('X-Guest-Order-Token',accessToken);
  assert.equal(viewed.status,200);assert.equal(viewed.body.guestTokenHash,undefined);assert.equal(viewed.body.guestAccessToken,undefined);assert.equal(viewed.body.adminNote,undefined);
  assert.equal((await request(app).get(path).set(auth(admin))).status,200);
  assert.equal((await request(app).get('/api/orders/myorders')).status,401);
});
test('guest VNPay checkout and signed IPN complete without login',async()=>{
  const path=`/api/orders/${guestOrder._id}`;
  const checkout=await request(app).post(`${path}/checkout`).set('X-Guest-Order-Token',accessToken);
  assert.equal(checkout.status,200);assert.equal(checkout.body.amountVnd,937500);
  const ref=new URL(checkout.body.url).searchParams.get('vnp_TxnRef');
  const values={vnp_TmnCode:'TESTCODE',vnp_TxnRef:ref,vnp_Amount:'93750000',vnp_ResponseCode:'00',vnp_TransactionStatus:'00',vnp_TransactionNo:'123459876'};
  const query=new URLSearchParams({...values,vnp_SecureHash:signPayment(values,'guest-fixture')});
  assert.equal((await request(app).get(`/api/orders/vnpay/ipn?${query}`)).body.RspCode,'00');
  const paid=await request(app).get(`${path}/pay`).set('X-Guest-Order-Token',accessToken);
  assert.equal(paid.status,200);assert.equal(paid.body.isPaid,true);assert.equal((await Product.findById(product._id)).countInStock,4);
});
test('profile phone is normalized, unique across accounts and cannot change privileges',async()=>{
  const path='/api/users/profile';
  assert.equal((await request(app).put(path).send({name:'Other',phone:'0934567890'})).status,401);
  const duplicate=await request(app).put(path).set(auth(other)).send({name:'Other',phone:'+84 981 234 567'});
  assert.equal(duplicate.status,409);assert.equal((await User.findById(other._id)).phone,undefined);
  const updated=await request(app).put(path).set(auth(other)).send({name:'Other',phone:'+84 934 567 890'});
  assert.equal(updated.status,200);assert.equal(updated.body.phone,'0934567890');assert.equal(updated.body.password,undefined);
  assert.equal((await request(app).put(path).set(auth(other)).send({name:'Other',phone:'0934567890',isAdmin:true})).status,400);
  assert.equal((await User.findById(other._id)).isAdmin,false);
});
test('concurrent signups cannot claim the same normalized phone',async()=>{
  const signup=phone=>{const email=`race-${emails.length}-${suffix}@example.test`;emails.push(email);return request(app).post('/api/users/register').send({name:'Phone race',email,password:'password123',phone});};
  const responses=await Promise.all([signup('0977772222'),signup('+84 977 772 222')]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
  assert.equal(await User.countDocuments({phone:'0977772222'}),1);
  const email=`missing-phone-${suffix}@example.test`;emails.push(email);
  assert.equal((await request(app).post('/api/users/register').send({name:'Missing phone',email,password:'password123'})).status,400);
});
