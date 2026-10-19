import express from 'express';
import {
  addOrderItems,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderToDelivered,
  createCheckoutSession,
  markOrderPaid,
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, addOrderItems);
router.get('/myorders', protect, getMyOrders);
router.get('/', protect, admin, getOrders);
router.get('/:id', protect, getOrderById);
router.get('/:id/pay', protect, markOrderPaid);
router.post('/:id/checkout', protect, createCheckoutSession);
router.put('/:id/deliver', protect, admin, updateOrderToDelivered);

export default router;
