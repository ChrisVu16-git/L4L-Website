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

Follow the [root README local setup](../README.md#run-locally), the canonical
setup guide. It includes Windows commands, replica-set initialization, optional
seeding, local demo accounts and optional R2/VNPay credentials. From `mern-shop/`:

```bash
npm install
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Set a private JWT_SECRET in backend/.env and use separate dev/test databases.
docker compose up -d --wait --wait-timeout 90
npm run dev
```

## VNPay sandbox setup

See the [root README](../README.md#vnpay-sandbox-payments) and `backend/.env.example`
for merchant credentials, VND currency behavior, public HTTPS IPN, return URL,
and replica-set requirements. The customer reviews the VND quote before redirecting
to VNPay. A signed server IPN, not the browser return, confirms payment.

## Deploy Online

### Backend → [Render.com](https://render.com) (free tier)

1. Push this repo to GitHub
2. Create a new **Web Service** from the repo, root directory: `mern-shop/backend`
3. Set environment variables from `backend/.env.example`
4. Use MongoDB Atlas connection string for `MONGODB_URI`
5. Or use the included `render.yaml` blueprint for one-click deploy

### Frontend → [Vercel](https://vercel.com) or Render Static Site

1. Import the repo, root directory: `mern-shop/frontend`
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
