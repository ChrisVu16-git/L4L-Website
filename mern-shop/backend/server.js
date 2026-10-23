// import express from 'express';
// import dotenv from 'dotenv';
// import cors from 'cors';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import connectDB from './config/db.js';
// import userRoutes from './routes/userRoutes.js';
// import productRoutes from './routes/productRoutes.js';
// import orderRoutes from './routes/orderRoutes.js';
// import { stripeWebhook } from './controllers/orderController.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// dotenv.config();
// connectDB();

// const app = express();

// app.post('/api/orders/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
// app.use(express.json());

// app.get('/api/health', (_req, res) => {
//   res.json({ status: 'ok', message: 'MERN Shop API is running' });
// });

// app.use('/api/users', userRoutes);
// app.use('/api/products', productRoutes);
// app.use('/api/orders', orderRoutes);


// if(process.env.NODE_ENV === 'production'){
//   const frontendDist = path.join(__dirname, '../frontend/dist');
//   app.use(express.static(frontendDist));
//   app.get('*', (_req, res) => {
//     res.sendFile(path.join(frontendDist, 'index.html'));
//   });
// }

// app.use((err, _req, res, _next) => {
//   const status = res.statusCode === 200 ? 500 : res.statusCode;
//   res.status(status).json({ message: err.message || 'Server error' });
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


import dotenv from 'dotenv';
import connectDB from './config/db.js';
import app from './app.js';

dotenv.config();

try {
  await connectDB();
} catch (error) {
  console.error('Failed to connect to MongoDB:', error.message);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
