import express from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  getUserProfile,
  getUsers,
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
router.post('/register', authLimit, registerUser);
router.post('/verify-email', authLimit, verifyEmail);
router.post('/resend-verification', authLimit, resendVerification);
router.post('/login', authLimit, loginUser);
router.get('/profile', protect, getUserProfile);
router.get('/', protect, admin, getUsers);

export default router;
