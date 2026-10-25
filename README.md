# L4LStore

A full-stack e-commerce web application built with React and Node.js. This project demonstrates a product catalogue, user authentication, shopping-cart flow, and admin-only product management backed by MongoDB.

**Live storefront:** [Open L4LStore](https://l4l-website-1.onrender.com/)  
**Backend health:** [API health check](https://l4l-website.onrender.com/api/health)  
**Products API:** [Browse product data](https://l4l-website.onrender.com/api/products)  
**Source code:** [ChrisVu16-git/L4L-Website](https://github.com/ChrisVu16-git/L4L-Website)

> **Status:** The frontend and backend are deployed as separate Render services. Payment processing is not currently deployed or verified for real transactions. Do not enter real payment details.

## Features

- Browse products, view product details, search, and filter the catalogue
- Register and sign in using JWT-based authentication
- Shopping-cart and checkout/order screens
- Protect authenticated-user and admin-only pages
- Admin-protected product create, read, update, and delete (CRUD) API operations
- Validate product fields and handle malformed product IDs and API errors
- Upload product images through Cloudinary
- Replace product images and clean up managed images when they are no longer referenced
- Backend API tests using Node.js's built-in test runner and Supertest

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, React Router, Vite |
| Backend | Node.js, Express 4 |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JWT, bcryptjs |
| Image uploads | Cloudinary, Multer |
| API testing | Node.js test runner, Supertest |
| Deployment | Render |
| Version control | Git, GitHub |

## Repository structure

The application code lives inside `mern-shop/`.

```text
L4L-Website/
├── README.md
└── mern-shop/
    ├── package.json
    ├── backend/
    │   ├── app.js
    │   ├── server.js
    │   ├── config/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── models/
    │   ├── routes/
    │   ├── utils/
    │   ├── tests/
    │   └── package.json
    └── frontend/
        ├── src/
        ├── public/
        └── package.json
```

## Run locally

### Prerequisites

- Node.js and npm
- MongoDB (local or MongoDB Atlas)
- A Cloudinary account for image uploads

### 1. Clone and install dependencies

From your terminal:

```bash
git clone https://github.com/ChrisVu16-git/L4L-Website.git
cd L4L-Website/mern-shop
npm install
npm run install:all
```

### 2. Configure the backend

Create `mern-shop/backend/.env` with your own values:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/mern-shop
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Replace the MongoDB and Cloudinary values with your own credentials. Use a strong, private `JWT_SECRET`. Never commit real credentials or `.env` files.

### 3. Configure the frontend

Create `mern-shop/frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Vite reads `VITE_*` variables at build time. Rebuild and redeploy the frontend after changing the deployed API URL.

### 4. Start the application

From `mern-shop/`:

```bash
npm run dev
```

Default local URLs:

- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/api/health
- Products API: http://localhost:5000/api/products

The backend connects to MongoDB when it starts. If database-backed routes fail, check `MONGODB_URI` and the backend logs. A successful health response alone does not prove database connectivity.

## Backend tests

The backend tests use Node.js's built-in test runner and Supertest. Configure a separate test database in `mern-shop/backend/.env`:

```env
TEST_MONGO_URI=mongodb://127.0.0.1:27017/mern-shop-test
```

Ensure `MONGODB_URI`, `TEST_MONGO_URI`, `JWT_SECRET`, and `CLOUDINARY_URL` are configured. Then run:

```bash
cd backend
npm test
```

Run tests only against a database intended for testing, not production data; tests may create and delete test records.

To build the frontend, run from `mern-shop/`:

```bash
npm run build
```

## API overview

All endpoints are mounted under `/api`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Check API health |
| POST | `/api/users/register` | Public | Register a user |
| POST | `/api/users/login` | Public | Sign in and receive an authentication token |
| GET | `/api/users/profile` | Authenticated | Retrieve the current user's profile |
| GET | `/api/products` | Public | List products |
| GET | `/api/products/categories` | Public | List product categories |
| GET | `/api/products/:id` | Public | Retrieve a product |
| POST | `/api/products/:id/reviews` | Authenticated | Submit a product review |
| POST | `/api/products` | Admin | Create a product |
| PUT | `/api/products/:id` | Admin | Update a product |
| DELETE | `/api/products/:id` | Admin | Delete a product |
| POST | `/api/uploads` | Access controlled by upload route middleware | Upload a product image |

Admin product operations require a valid token and admin authorization. Check the route and middleware files for exact access rules, request bodies, and response formats.

## Deployment

The frontend and backend are deployed as separate Render services.

| Service | URL / configuration |
|---|---|
| Frontend | https://l4l-website-1.onrender.com/ |
| Backend | https://l4l-website.onrender.com |
| Health check | `/api/health` |
| Frontend environment | `VITE_API_URL=https://l4l-website.onrender.com/api` |
| Backend CORS origin | `CLIENT_URL=https://l4l-website-1.onrender.com` |

Configure `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_URL`, and `CLIENT_URL` in the backend Render service's environment settings. Keep secrets out of Git. Rebuild and redeploy the frontend after changing `VITE_API_URL`.

## Verification notes

The following checks were reported as completed during deployment testing:

- Health endpoint and products API responses
- Storefront rendering and frontend-to-backend connectivity
- Login/JWT behaviour and protected admin access
- Product CRUD, field validation, and malformed-ID handling
- Cloudinary upload, replacement, upload rejection, and managed-image cleanup
- Responsive layout and browser-console review

These notes reflect reported test results, not a guarantee about future deployments. Re-run relevant checks after code or configuration changes. Payment processing has not been deployed or verified for real transactions.

## Known limitations and next steps

- Payment processing is not ready for real transactions.
- Add automated frontend and end-to-end tests.
- Add CI checks for backend tests and frontend builds.
- Expand API documentation with example request and response bodies.

## License

No license is specified. Until a license is added, do not assume others have permission to reuse, modify, or distribute this project.
