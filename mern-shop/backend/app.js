import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { stripeWebhook } from './controllers/orderController.js';
import uploadRoutes from './routes/uploadRoutes.js';


const app = express();

app.post('/api/orders/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
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