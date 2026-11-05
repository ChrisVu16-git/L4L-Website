import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { normalizeEmail } from '../utils/identity.js';

const generateToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const publicUser = user => ({ _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, emailVerified: user.emailVerified });
// Email confirmation is temporarily disabled. Preserve emailVerified as actual
// mailbox-proof data; do not mark users verified just to bypass the requirement.
export const registerUser = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || !email || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ message: 'Enter a name, valid email, and password of 8–72 bytes.' });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: 'Account already exists. Please sign in.' });
    const user = await User.create({ name: name.trim(), email, password });
    res.status(201).json({ ...publicUser(user), token: generateToken(user._id) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Account already exists. Please sign in.' });
    next(err);
  }
};

// Keep old links/endpoints predictable, without sending or consuming tokens.
export const resendVerification = (_req, res) => res.status(410).json({ message: 'Email confirmation is temporarily disabled. You can sign in normally.' });
export const verifyEmail = resendVerification;

export const loginUser = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || typeof password !== 'string' || Buffer.byteLength(password) > 72) return res.status(401).json({ message: 'Invalid email or password' });
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ ...publicUser(user), token: generateToken(user._id) });
  } catch (err) { next(err); }
};
export const getUserProfile = async (req, res) => res.json(publicUser(req.user));
export const getUsers = async (_req, res, next) => {
  try { res.json(await User.find({}).select('-password')); } catch (err) { next(err); }
};
