import express from 'express';
import mongoose from 'mongoose';
import {
  addOrderItems,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderToDelivered,
  updateOrder,
  createCheckoutSession,
  markOrderPaid,
  vnpayIpn,
  vnpayReturn,
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid order ID' });
  next();
});
const safe = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/vnpay/ipn', safe(vnpayIpn));
router.get('/vnpay/return', safe(vnpayReturn));

router.post('/', protect, safe(addOrderItems));
router.get('/myorders', protect, safe(getMyOrders));
router.get('/', protect, admin, safe(getOrders));
router.get('/:id', protect, safe(getOrderById));
router.get('/:id/pay', protect, safe(markOrderPaid));
router.post('/:id/checkout', protect, safe(createCheckoutSession));
router.put('/:id', protect, admin, safe(updateOrder));
router.put('/:id/deliver', protect, admin, safe(updateOrderToDelivered));

export default router;
