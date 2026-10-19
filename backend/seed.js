import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';
import Product from './models/Product.js';

dotenv.config();
await connectDB();

await User.deleteMany();
await Product.deleteMany();

const admin = await User.create({
  name: 'Admin User',
  email: 'admin@mernshop.com',
  password: 'admin123',
  isAdmin: true,
});

const customer = await User.create({
  name: 'Demo Customer',
  email: 'demo@mernshop.com',
  password: 'demo123',
});

const products = [
  {
    name: 'Wireless Headphones',
    description: 'Premium noise-cancelling wireless headphones with 30-hour battery life.',
    price: 149.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    countInStock: 25,
    rating: 4.5,
    numReviews: 12,
  },
  {
    name: 'Smart Watch',
    description: 'Fitness tracking smartwatch with heart rate monitor and GPS.',
    price: 199.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    countInStock: 15,
    rating: 4.2,
    numReviews: 8,
  },
  {
    name: 'Classic Leather Jacket',
    description: 'Genuine leather jacket with modern slim fit design.',
    price: 249.99,
    category: 'Fashion',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
    countInStock: 10,
    rating: 4.8,
    numReviews: 5,
  },
  {
    name: 'Running Shoes',
    description: 'Lightweight running shoes with responsive cushioning.',
    price: 89.99,
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    countInStock: 30,
    rating: 4.6,
    numReviews: 20,
  },
  {
    name: 'Coffee Maker',
    description: 'Programmable drip coffee maker with thermal carafe.',
    price: 79.99,
    category: 'Home',
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400&h=400&fit=crop',
    countInStock: 18,
    rating: 4.3,
    numReviews: 7,
  },
  {
    name: 'Backpack',
    description: 'Durable water-resistant backpack with laptop compartment.',
    price: 59.99,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    countInStock: 40,
    rating: 4.4,
    numReviews: 15,
  },
];

await Product.insertMany(products);

console.log('Database seeded!');
console.log(`Admin: ${admin.email} / admin123`);
console.log(`Customer: ${customer.email} / demo123`);
process.exit();
