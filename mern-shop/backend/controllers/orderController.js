import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { paymentConfig, amountVnd, checkoutUrl, callbackParams, verifyPayment, matchesAttempt, paymentSucceeded } from '../utils/payments.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';



export const addOrderItems = async (req, res) => {
  try {
  const { orderItems, shippingAddress } = req.body;
  const paymentMethod = 'vnpay';
  if (!shippingAddress || ['address', 'city', 'postalCode', 'country'].some(key => typeof shippingAddress[key] !== 'string' || !shippingAddress[key].trim() || shippingAddress[key].length > 200)) {
    return res.status(400).json({ message: 'Enter a complete shipping address.' });
  }
  if (!Array.isArray(orderItems) || orderItems.length > 100 || orderItems.some(item => !item || !mongoose.isValidObjectId(item.product) || !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 100) || new Set(orderItems.map(item => String(item.product))).size !== orderItems.length) {
    return res.status(400).json({ message: 'Invalid order items or quantities.' });
  }

  if (!orderItems?.length) {
    return res.status(400).json({ message: 'No order items' });
  }

  const itemsFromDb = await Promise.all(
    orderItems.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Product not found: ${item.product}`);
      if (product.countInStock < item.qty) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      return {
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        qty: item.qty,
      };
    })
  );

  const itemsPrice = itemsFromDb.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shippingPrice = itemsPrice > 100 ? 0 : 10;
  const taxPrice = Number((itemsPrice * 0.1).toFixed(2));
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  const order = await Order.create({
    user: req.user._id,
    orderItems: itemsFromDb,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  });

  res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (order) {
    if (order.user._id.toString() === req.user._id.toString() || req.user.isAdmin) {
      return res.json(order);
    }
    return res.status(403).json({ message: 'Not authorized' });
  }
  res.status(404).json({ message: 'Order not found' });
};

export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
};

export const getOrders = async (_req, res) => {
  const orders = await Order.find({}).populate('user', 'id name email').sort({ createdAt: -1 });
  res.json(orders);
};

export const updateOrderToDelivered = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  const updated = await order.save();
  res.json(updated);
};

export const createCheckoutSession = async (req, res, next) => {
  try {
    const config = paymentConfig();
    let order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    if (order.isPaid) return res.status(400).json({ message: 'Order already paid' });
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (!product || product.countInStock < item.qty) return res.status(409).json({ message: 'An item is no longer in stock.' });
    }
    const now = new Date();
    if (!order.vnpayExpiresAt || order.vnpayExpiresAt <= now) {
      const attempt = {
        reference: randomBytes(16).toString('hex'),
        amountVnd: amountVnd(order.totalPrice, config.rate), usdToVndRate: config.rate,
        createdAt: now, expiresAt: new Date(now.getTime() + 15 * 60000),
      };
      // Only one concurrent request may create the current attempt. Old attempts
      // stay available for delayed signed notifications and reconciliation.
      const updated = await Order.findOneAndUpdate({ _id: order._id, isPaid: false,
        $or: [{ vnpayExpiresAt: { $lte: now } }, { vnpayExpiresAt: { $exists: false } }] },
        { $push: { vnpayAttempts: attempt }, $set: { vnpayExpiresAt: attempt.expiresAt, paymentMethod: 'vnpay' } }, { new: true });
      order = updated || await Order.findById(order._id);
    }
    if (!order || order.isPaid) return res.status(409).json({ message: 'Order payment status changed. Refresh the order.' });
    const attempt = order.vnpayAttempts.at(-1);
    if (!attempt) return res.status(409).json({ message: 'Could not prepare checkout. Try again.' });
    res.json({ url: checkoutUrl(order, attempt, req.ip, config), amountVnd: attempt.amountVnd,
      usdToVndRate: attempt.usdToVndRate, expiresAt: attempt.expiresAt });
  } catch (err) {
    if (err.code === 'PAYMENTS_UNCONFIGURED') return res.status(503).json({ message: err.message });
    next(err);
  }
};

const readCallback = req => {
  const config = paymentConfig();
  const params = callbackParams(req.originalUrl);
  if (!verifyPayment(params, config.secret) || params.vnp_TmnCode !== config.tmnCode) throw new Error('Invalid VNPay signature or merchant');
  return { config, params };
};

export const vnpayReturn = async (req, res) => {
  try {
    const { config, params } = readCallback(req);
    const order = await Order.findOne({ 'vnpayAttempts.reference': params.vnp_TxnRef });
    const attempt = order?.vnpayAttempts.find(a => a.reference === params.vnp_TxnRef);
    if (!attempt || !matchesAttempt(params, attempt, config)) return res.status(400).json({ message: 'Invalid VNPay payment return.' });
    const url = new URL(`/order/${order._id}`, process.env.CLIENT_URL || 'http://localhost:5173');
    url.searchParams.set('payment', paymentSucceeded(params) ? 'pending' : 'failed');
    // Browser return never mutates stock or paid status; only signed IPN does.
    res.redirect(303, url.toString());
  } catch { res.status(400).json({ message: 'Invalid VNPay payment return.' }); }
};

export const vnpayIpn = async (req, res) => {
  const reply = (RspCode, Message) => res.status(200).json({ RspCode, Message });
  let config, params;
  try { ({ config, params } = readCallback(req)); }
  catch { return reply('97', 'Invalid signature or merchant'); }
  try {
    const result = await mongoose.connection.transaction(async dbSession => {
      const order = await Order.findOne({ 'vnpayAttempts.reference': params.vnp_TxnRef }).session(dbSession);
      if (!order) return ['01', 'Order not found'];
      const attempt = order.vnpayAttempts.find(a => a.reference === params.vnp_TxnRef);
      if (!matchesAttempt(params, attempt, config)) return ['04', 'Invalid amount'];
      if (order.isPaid) return ['02', 'Order already confirmed'];
      if (!paymentSucceeded(params)) {
        if (params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00') return ['99', 'Invalid transaction number'];
        if (!/^[0-9]{2}$/.test(params.vnp_ResponseCode || '') || !/^[0-9]{2}$/.test(params.vnp_TransactionStatus || '')) return ['99', 'Invalid payment status'];
        attempt.responseCode = params.vnp_ResponseCode;
        attempt.transactionStatus = params.vnp_TransactionStatus;
        if (order.vnpayAttempts.at(-1).reference === attempt.reference) order.vnpayExpiresAt = new Date();
        await order.save({ session: dbSession });
        return ['00', 'Unsuccessful payment acknowledged'];
      }
      for (const item of order.orderItems) {
        const update = await Product.updateOne({ _id: item.product, countInStock: { $gte: item.qty } }, { $inc: { countInStock: -item.qty } }, { session: dbSession });
        if (update.modifiedCount !== 1) throw new Error('Paid order needs stock reconciliation');
      }
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentMethod = 'vnpay';
      order.paymentResult = { id: params.vnp_TransactionNo, status: '00' };
      await order.save({ session: dbSession });
      return ['00', 'Confirm Success'];
    });
    return reply(...result);
  } catch (err) {
    console.error('VNPay fulfillment failed:', err.message);
    return reply('99', 'Fulfillment failed; reconcile and retry');
  }
};

export const markOrderPaid = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  res.json({
    isPaid: order.isPaid,
    paidAt: order.paidAt,
  });
};
