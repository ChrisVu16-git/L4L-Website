import 'dotenv/config';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Product from '../models/Product.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

test('Connect to test database', async () => {
  assert.ok(
    process.env.TEST_MONGO_URI,
    'TEST_MONGO_URI must be set in backend/.env'
  );

  await mongoose.connect(process.env.TEST_MONGO_URI);
  assert.equal(mongoose.connection.readyState, 1);
});

test('GET /api/health returns a healthy response', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: 'ok',
    message: 'MERN Shop API is running',
  });
});

test('GET /api/products/:id returns an existing product', async () => {
  const product = await Product.findOne();

  if (!product) {
    assert.fail(
      'No test products found. Add a sample product to l4lstore_test first.'
    );
  }

  const response = await request(app).get(`/api/products/${product._id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body._id, product._id.toString());
  assert.equal(response.body.name, product.name);
  });

test('GET /api/products/:id rejects a malformed ID', async () => {
  const response = await request(app).get(
    '/api/products/not-a-valid-id'
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Invalid product ID');
});

test('PUT /api/products/:id rejects a malformed ID', async () => {
  assert.ok(process.env.JWT_SECRET, 'JWT_SECRET must be set in backend/.env');

  const user = await User.create({
    name: 'Malformed ID Test Admin',
    username: 'malformed_put_admin',
    email: `malformed_put_${Date.now()}@test.com`,
    password: 'TestPassword123!',
    isAdmin: true,
  });

  try {
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .put('/api/products/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Test Product' });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Invalid product ID');
  } finally {
    await User.deleteOne({ _id: user._id });
  }
});

test('DELETE /api/products/:id rejects a malformed ID', async () => {
  assert.ok(process.env.JWT_SECRET, 'JWT_SECRET must be set in backend/.env');

  const user = await User.create({
    name: 'Malformed ID Test Admin',
    username: 'malformed_delete_admin',
    email: `malformed_delete_${Date.now()}@test.com`,
    password: 'TestPassword123!',
    isAdmin: true,
  });

  try {
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .delete('/api/products/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Invalid product ID');
  } finally {
    await User.deleteOne({ _id: user._id });
  }
});


test('POST /api/products/:id/reviews rejects a malformed ID', async () => {
  assert.ok(process.env.JWT_SECRET, 'JWT_SECRET must be set in backend/.env');

  const user = await User.create({
    name: 'Malformed Review Test User',
    username: 'malformed_review_user',
    email: `malformed_review_${Date.now()}@test.com`,
    password: 'TestPassword123!',
    isAdmin: false,
  });

  try {
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .post('/api/products/not-a-valid-id/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rating: 5,
        comment: 'Test review',
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Invalid product ID');
  } finally {
    await User.deleteOne({ _id: user._id });
  }
});



test('POST /api/products rejects a regular user', async () => {
  assert.ok(process.env.JWT_SECRET, 'JWT_SECRET must be set in backend/.env');

  const email = `test-user-${Date.now()}@example.com`;

  const user = await User.create({
    name: 'API Test User',
    email,
    password: 'test-password-123',
    isAdmin: false,
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  try {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Product',
        description: 'Automated test product',
        price: 10,
        category: 'Testing',
        image: 'test.jpg',
        countInStock: 5,
      });

    assert.equal(response.status, 403);
    assert.equal(response.body.message, 'Admin access required');
  } finally {
    await User.deleteOne({ _id: user._id });
  }
});

test('POST /api/products rejects missing fields for an admin', async () => {
  assert.ok(process.env.JWT_SECRET, 'JWT_SECRET must be set in backend/.env');

  const email = `test-admin-${Date.now()}@example.com`;

  const user = await User.create({
    name: 'API Test Admin',
    email,
    password: 'test-password-123',
    isAdmin: true,
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  try {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    assert.equal(response.status, 400);
    assert.equal(
      response.body.message,
      'Please provide all required product fields'
    );
  } finally {
    await User.deleteOne({ _id: user._id });
  }
});

test('POST /api/products rejects requests without a token', async () => {
  const response = await request(app)
    .post('/api/products')
    .send({
      name: 'Test Product',
      description: 'Automated test product',
      price: 10,
      category: 'Testing',
      image: 'test.jpg',
      countInStock: 5,
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Not authorized, no token');
});

test('POST /api/products rejects missing required fields', async () => {
  const response = await request(app)
    .post('/api/products')
    .set('Authorization', 'Bearer invalid-test-token')
    .send({});

  assert.equal(response.status, 401);
});


test('POST /api/products creates a product as an admin', async () => {
  assert.ok(process.env.JWT_SECRET, 'JWT_SECRET.env');

  const email = `test-admin-create-${Date.now()}@example.com`;
  const productName = `API Test Product ${Date.now()}`;

  let user;

  try {
    user = await User.create({
      name: 'API Test Admin',
      email,
      password: 'test-password-123',
      isAdmin: true,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const payload = {
      name: productName,
      description: 'Created by an automated API test',
      price: 25,
      category: 'Testing',
      image: 'test-product.jpg',
      countInStock: 5,
    };

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    assert.equal(response.status, 201);
    assert.equal(response.body.name, productName);
    assert.equal(response.body.price, 25);
    assert.equal(response.body.countInStock, 5);

    const savedProduct = await Product.findById(response.body._id);

    assert.ok(savedProduct, 'Product should be saved in the test database');
    assert.equal(savedProduct.name, productName);
    assert.equal(savedProduct.category, 'Testing');
  } finally {
    await Product.deleteOne({ name: productName });

    if (user) {
      await User.deleteOne({ _id: user._id });
    }
  }
});


test('POST /api/products rejects a negative price', async () => {
  const email = `test-price-${Date.now()}@example.com`;
  let user;

  try {
    user = await User.create({
      name: 'API Test Admin',
      email,
      password: 'test-password-123',
      isAdmin: true,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Invalid Price Product',
        description: 'Testing negative price',
        price: -10,
        category: 'Testing',
        image: 'test.jpg',
        countInStock: 5,
      });

    assert.equal(response.status, 400);
    assert.equal(
      response.body.message,
      'Price must be non-negative and stock must be a non-negative integer'
    );
  } finally {
    if (user) {
      await User.deleteOne({ _id: user._id });
    }
  }
});

test('POST /api/products rejects negative stock', async () => {
  const email = `test-stock-${Date.now()}@example.com`;
  let user;

  try {
    user = await User.create({
      name: 'API Test Admin',
      email,
      password: 'test-password-123',
      isAdmin: true,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Invalid Stock Product',
        description: 'Testing negative stock',
        price: 10,
        category: 'Testing',
        image: 'test.jpg',
        countInStock: -5,
      });

    assert.equal(response.status, 400);
    assert.equal(
      response.body.message,
      'Price must be non-negative and stock must be a non-negative integer'
    );
  } finally {
    if (user) {
      await User.deleteOne({ _id: user._id });
    }
  }
});


test('PUT /api/products/:id updates a product as an admin', async () => {
  const email = `test-update-${Date.now()}@example.com`;
  let user;
  let product;

  try {
    user = await User.create({
      name: 'API Test Admin',
      email,
      password: 'test-password-123',
      isAdmin: true,
    });

    product = await Product.create({
      name: 'Product Before Update',
      description: 'Original description',
      price: 100,
      category: 'Testing',
      image: 'test.jpg',
      countInStock: 5,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .put(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Product After Update',
        price: 150,
        countInStock: 8,
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.name, 'Product After Update');
    assert.equal(response.body.price, 150);
    assert.equal(response.body.countInStock, 8);

    const savedProduct = await Product.findById(product._id);
    assert.equal(savedProduct.name, 'Product After Update');
    assert.equal(savedProduct.price, 150);
    assert.equal(savedProduct.countInStock, 8);
  } finally {
    if (product) {
      await Product.deleteOne({ _id: product._id });
    }
    if (user) {
      await User.deleteOne({ _id: user._id });
    }
  }
});

test('DELETE /api/products/:id deletes a product as an admin', async () => {
  const email = `test-delete-${Date.now()}@example.com`;
  let user;
  let product;

  try {
    user = await User.create({
      name: 'API Test Admin',
      email,
      password: 'test-password-123',
      isAdmin: true,
    });

    product = await Product.create({
      name: 'Product To Delete',
      description: 'Temporary deletion test',
      price: 100,
      category: 'Testing',
      image: 'test.jpg',
      countInStock: 5,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .delete(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.message, 'Product removed');

    const deletedProduct = await Product.findById(product._id);
    assert.equal(deletedProduct, null);
  } finally {
    if (product) {
      await Product.deleteOne({ _id: product._id });
    }
    if (user) {
      await User.deleteOne({ _id: user._id });
    }
  }
});


test('PUT /api/products/:id rejects a regular user', async () => {
  const email = `test-update-user-${Date.now()}@example.com`;
  let user;
  let product;

  try {
    user = await User.create({
      name: 'API Test User',
      email,
      password: 'test-password-123',
      isAdmin: false,
    });

    product = await Product.create({
      name: 'Protected Product',
      description: 'Authorization test',
      price: 100,
      category: 'Testing',
      image: 'test.jpg',
      countInStock: 5,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .put(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Unauthorized Update' });

    assert.equal(response.status, 403);
    assert.equal(response.body.message, 'Admin access required');
  } finally {
    if (product) await Product.deleteOne({ _id: product._id });
    if (user) await User.deleteOne({ _id: user._id });
  }
});

test('DELETE /api/products/:id rejects a regular user', async () => {
  const email = `test-delete-user-${Date.now()}@example.com`;
  let user;
  let product;

  try {
    user = await User.create({
      name: 'API Test User',
      email,
      password: 'test-password-123',
      isAdmin: false,
    });

    product = await Product.create({
      name: 'Protected Delete Product',
      description: 'Authorization test',
      price: 100,
      category: 'Testing',
      image: 'test.jpg',
      countInStock: 5,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .delete(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.message, 'Admin access required');

    const savedProduct = await Product.findById(product._id);
    assert.ok(savedProduct, 'Product should not be deleted by a regular user');
  } finally {
    if (product) await Product.deleteOne({ _id: product._id });
    if (user) await User.deleteOne({ _id: user._id });
  }
});

test('PUT /api/products/:id returns 404 for a nonexistent product', async () => {
  const email = `test-update-missing-${Date.now()}@example.com`;
  let user;

  try {
    user = await User.create({
      name: 'API Test Admin',
      email,
      password: 'test-password-123',
      isAdmin: true,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const nonexistentId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .put(`/api/products/${nonexistentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Product' });

    assert.equal(response.status, 404);
    assert.equal(response.body.message, 'Product not found');
  } finally {
    if (user) await User.deleteOne({ _id: user._id });
  }
});

test('DELETE /api/products/:id returns 404 for a nonexistent product', async () => {
  const email = `test-delete-missing-${Date.now()}@example.com`;
  let user;

  try {
    user = await User.create({
      name: 'API Test Admin',
      email,
      password: 'test-password-123',
      isAdmin: true,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    const nonexistentId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`/api/products/${nonexistentId}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 404);
    assert.equal(response.body.message, 'Product not found');
  } finally {
    if (user) await User.deleteOne({ _id: user._id });
  }
});



after(async () => {
  await mongoose.disconnect();
});