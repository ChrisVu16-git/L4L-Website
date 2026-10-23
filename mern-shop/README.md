# MERN Shop — E-Commerce Website

A full-stack online store built with **MongoDB**, **Express**, **React**, and **Node.js**. Includes user authentication, product catalog, shopping cart, Stripe checkout, and an admin dashboard.

## Features

- Product catalog with search and category filters
- User registration and JWT authentication
- Persistent shopping cart (localStorage)
- Multi-step checkout with Stripe payments
- Order history and order tracking
- Admin panel to manage products and orders
- Production-ready deployment configs (Render, Vercel)

## Quick Start (Local)

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/) (local or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### 1. Clone and install

```bash
cd mern-shop
npm run install:all
```

### 2. Start MongoDB

**Option A — Docker:**
```bash
docker compose up -d
```

**Option B — MongoDB Atlas:** Create a free cluster and copy your connection string.

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:
```
MONGODB_URI=mongodb://127.0.0.1:27017/mern-shop
JWT_SECRET=your-super-secret-key-change-in-production
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...   # from stripe.com dashboard
STRIPE_WEBHOOK_SECRET=whsec_... # optional for local dev
```

### 4. Seed the database

```bash
npm run seed
```

Demo accounts:
| Role     | Email               | Password  |
|----------|---------------------|-----------|
| Admin    | admin@mernshop.com  | admin123  |
| Customer | demo@mernshop.com   | demo123   |

### 5. Run the app

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api/health

## Stripe Setup

1. Create a free account at [stripe.com](https://stripe.com)
2. Get your **test** secret key from Developers → API keys
3. Add it to `backend/.env` as `STRIPE_SECRET_KEY`
4. For production webhooks: add endpoint `https://your-api.com/api/orders/webhook` in Stripe Dashboard → Webhooks, event: `checkout.session.completed`

Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## Deploy Online

### Backend → [Render.com](https://render.com) (free tier)

1. Push this repo to GitHub
2. Create a new **Web Service** from the repo, root directory: `backend`
3. Set environment variables from `backend/.env.example`
4. Use MongoDB Atlas connection string for `MONGODB_URI`
5. Or use the included `render.yaml` blueprint for one-click deploy

### Frontend → [Vercel](https://vercel.com) or Render Static Site

1. Import the repo, root directory: `frontend`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set `VITE_API_URL=https://your-api.onrender.com/api`

### Frontend → Vercel (alternative)

```bash
cd frontend
npx vercel --prod
```

Set `VITE_API_URL` in Vercel project settings.

## Project Structure

```
mern-shop/
├── backend/          # Express API
│   ├── config/       # Database connection
│   ├── controllers/  # Route handlers
│   ├── middleware/   # Auth middleware
│   ├── models/       # Mongoose schemas
│   ├── routes/       # API routes
│   ├── server.js     # Entry point
│   └── seed.js       # Sample data
├── frontend/         # React + Vite
│   └── src/
│       ├── components/
│       ├── context/  # Auth & Cart state
│       ├── pages/
│       └── utils/
├── docker-compose.yml
└── render.yaml
```

## API Endpoints

| Method | Endpoint                    | Description          |
|--------|-----------------------------|----------------------|
| POST   | /api/users/register         | Register user        |
| POST   | /api/users/login            | Login user           |
| GET    | /api/products               | List products        |
| GET    | /api/products/:id           | Get product          |
| POST   | /api/orders                 | Create order         |
| POST   | /api/orders/:id/checkout    | Stripe checkout      |
| GET    | /api/orders/myorders        | User orders          |

## License

MIT
