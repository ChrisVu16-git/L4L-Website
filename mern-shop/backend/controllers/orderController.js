import mongoose from 'mongoose';
import { getSandboxStripe, checkoutParams, validPaidSession } from '../utils/payments.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';



export const addOrderItems = async (req, res) => {
  try {
  const { orderItems, shippingAddress } = req.body;
  const paymentMethod = 'stripe';
  if (!req.user.emailVerified) return res.status(403).json({ message: 'Confirm your email before checkout.' });
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
    if (!req.user.emailVerified) return res.status(403).json({ message: 'Confirm your email before checkout.' });
    const stripe = getSandboxStripe();
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    if (order.isPaid) return res.status(400).json({ message: 'Order already paid' });
    if (order.stripeSessionId) {
      const existing = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      if (existing.status === 'open') return res.json({ url: existing.url, sessionId: existing.id });
      if (existing.status === 'complete') return res.status(409).json({ message: 'Payment is being confirmed. Refresh the order shortly.' });
    }
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (!product || product.countInStock < item.qty) return res.status(409).json({ message: 'An item is no longer in stock.' });
    }
    const session = await stripe.checkout.sessions.create(checkoutParams(order, req.user.email), {
      idempotencyKey: `order-${order._id}-${order.stripeSessionId || 'initial'}`,
    });
    order.stripeSessionId = session.id;
    await order.save();
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    if (err.code === 'PAYMENTS_UNCONFIGURED') return res.status(503).json({ message: err.message });
    next(err);
  }
};

export const stripeWebhook = async (req, res) => {
  let event;
  try {
    const stripe = getSandboxStripe();
    if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ message: 'Sandbox webhook is not configured.' });
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch { return res.status(400).json({ message: 'Invalid sandbox webhook signature or configuration.' }); }
  if (event.livemode || event.type !== 'checkout.session.completed') return res.json({ received: true });
  const session = event.data.object;
  if (session.payment_status !== 'paid' || !mongoose.isValidObjectId(session.metadata?.orderId)) return res.json({ received: true });
  try {
    // The order update and stock decrements commit together. Retries and duplicate
    // deliveries observe isPaid and cannot decrement stock twice.
    await mongoose.connection.transaction(async dbSession => {
      const order = await Order.findById(session.metadata.orderId).session(dbSession);
      if (!order || order.isPaid) return;
      if (!validPaidSession(session, order)) throw new Error('Payment does not match this order');
      for (const item of order.orderItems) {
        const result = await Product.updateOne({ _id: item.product, countInStock: { $gte: item.qty } }, { $inc: { countInStock: -item.qty } }, { session: dbSession });
        if (result.modifiedCount !== 1) throw new Error('Paid order needs stock reconciliation');
      }
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentResult = { id: session.payment_intent, status: session.payment_status, email_address: session.customer_details?.email };
      await order.save({ session: dbSession });
    });
    res.json({ received: true });
  } catch (err) {
    console.error('Sandbox payment fulfillment failed:', err.message);
    res.status(500).json({ message: 'Payment fulfillment failed; retry webhook after resolving the issue.' });
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
