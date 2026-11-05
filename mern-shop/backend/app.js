import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

import uploadRoutes from './routes/uploadRoutes.js';


const app = express();
app.use((_req, res, next) => { res.setHeader('X-L4L-Currency', 'VND'); next(); });
const allowedOrigins = [
  'http://localhost:5173',
  'https://l4-l-website.vercel.app',
];


// Set only for a known reverse-proxy topology; never blindly trust forwarded IPs.
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 3) throw new Error('Invalid TRUST_PROXY_HOPS');
app.set('trust proxy', proxyHops);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ['X-L4L-Currency'],
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'MERN Shop API is running' });
});

app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);


// production frontend setup


app.use((err, _req, res, _next) => {
  const status = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(status).json({ message: err.message || 'Server error' });
});


export default app;