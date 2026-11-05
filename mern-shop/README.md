# MERN Shop — E-Commerce Website

A full-stack online store built with **MongoDB**, **Express**, **React**, and **Node.js**. Includes user authentication, product catalog, shopping cart, VNPay sandbox checkout, and an admin dashboard.

## Features

- Product catalog with search and category filters
- User registration and JWT authentication
- Persistent shopping cart (localStorage)
- Multi-step checkout with VNPay sandbox payments
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
VNPAY_TMN_CODE=your_sandbox_terminal
VNPAY_HASH_SECRET=your_sandbox_secret
VNPAY_RETURN_URL=http://localhost:5000/api/orders/vnpay/return
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

## VNPay sandbox setup

See the [root README](../README.md#vnpay-sandbox-payments) and `backend/.env.example`
for merchant credentials, VND currency behavior, public HTTPS IPN, return URL,
and replica-set requirements. The customer reviews the VND quote before redirecting
to VNPay. A signed server IPN, not the browser return, confirms payment.

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
| POST   | /api/orders/:id/checkout    | VNPay sandbox checkout      |
| GET    | /api/orders/myorders        | User orders          |

## License

MIT
