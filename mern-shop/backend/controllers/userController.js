import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { normalizeEmail, verificationToken, hashToken } from '../utils/identity.js';
import { emailReady, sendVerification } from '../utils/email.js';

const generateToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const publicUser = user => ({ _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, emailVerified: user.emailVerified });
const pending = 'Check your inbox and spam folder for the confirmation link. If you already have an account, sign in or request a new confirmation.';

export const registerUser = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || !email || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ message: 'Enter a name, valid email, and password of 8–72 bytes.' });
    }
    if (!emailReady()) return res.status(503).json({ message: 'Account email delivery is not configured. Please try later.', code: 'EMAIL_NOT_CONFIGURED' });
    if (await User.exists({ email })) return res.status(202).json({ message: pending, verificationPending: true });
    const { token, hash, expires } = verificationToken();
    const user = await User.create({ name: name.trim(), email, password, verificationHash: hash, verificationExpires: expires, verificationSentAt: new Date() });
    try { await sendVerification(email, token); }
    catch (error) {
      await User.updateOne({ _id: user._id, verificationHash: hash }, { $unset: { verificationSentAt: '' } });
      console.error('Verification email failed:', error.code || 'EMAIL_DELIVERY_FAILED');
      return res.status(503).json({ message: 'Account created, but email delivery failed. Use Resend confirmation to try again.', code: 'EMAIL_DELIVERY_FAILED', verificationPending: true });
    }
    res.status(201).json({ message: pending, verificationPending: true });
  } catch (err) {
    if (err.code === 11000) return res.status(202).json({ message: pending, verificationPending: true });
    next(err);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!emailReady()) return res.status(503).json({ message: 'Email delivery is not configured.' });
    const { token, hash, expires } = verificationToken();
    const user = await User.findOneAndUpdate({ email, emailVerified: { $ne: true }, $or: [{ verificationSentAt: { $lt: new Date(Date.now() - 60000) } }, { verificationSentAt: { $exists: false } }] },
      { $set: { verificationHash: hash, verificationExpires: expires, verificationSentAt: new Date() } });
    if (user) {
      try { await sendVerification(email, token); }
      catch (error) {
        await User.updateOne({ _id: user._id, verificationHash: hash }, { $unset: { verificationSentAt: '' } });
        console.error('Verification email failed:', error.code || 'EMAIL_DELIVERY_FAILED');
        return res.status(503).json({ message: 'Email delivery failed. Please try again later.', code: 'EMAIL_DELIVERY_FAILED', verificationPending: true });
      }
    }
    res.status(202).json({ message: pending, verificationPending: true });
  } catch (err) { next(err); }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'Invalid or expired confirmation link.' });
    const user = await User.findOneAndUpdate({ verificationHash: hashToken(token), verificationExpires: { $gt: new Date() }, emailVerified: false },
      { $set: { emailVerified: true }, $unset: { verificationHash: '', verificationExpires: '', verificationSentAt: '' } }, { new: true });
    if (!user) return res.status(400).json({ message: 'Invalid or expired confirmation link. Request a new one.' });
    res.json({ message: 'Email confirmed. You can now sign in.' });
  } catch (err) { next(err); }
};

export const loginUser = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || typeof password !== 'string' || Buffer.byteLength(password) > 72) return res.status(401).json({ message: 'Invalid email or password' });
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.emailVerified) return res.status(403).json({ message: 'Confirm your email before signing in. Use Resend confirmation.', code: 'EMAIL_UNVERIFIED', verificationPending: true });
    res.json({ ...publicUser(user), token: generateToken(user._id) });
  } catch (err) { next(err); }
};
export const getUserProfile = async (req, res) => res.json(publicUser(req.user));
export const getUsers = async (_req, res, next) => {
  try { res.json(await User.find({}).select('-password')); } catch (err) { next(err); }
};
