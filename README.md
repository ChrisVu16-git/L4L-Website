# L4LStore — Full-Stack E-Commerce Web App

L4LStore is a full-stack online-store project built with the MERN stack. It includes a React storefront and an Express REST API backed by MongoDB Atlas, with JWT-based authentication, admin-protected product management, and Cloudinary image uploads.

## Live demo

- **Storefront:** https://l4l-website-1.onrender.com/
- **Backend health:** https://l4l-website.onrender.com/api/health
- **Products API:** https://l4l-website.onrender.com/api/products

> **Current status:** The storefront and backend are deployed. Payment processing is **not currently deployed**. Do not use this project to make real payments.

## Features

- Browse the product catalog and view product details
- Search and filter products
- User registration and login using JWT authentication
- Shopping cart experience
- Admin-protected product create, read, update, and delete (CRUD) operations
- Product input validation and API error handling
- Cloudinary image uploads, replacement, and managed cleanup
- REST API built with Express and MongoDB/Mongoose
- Automated backend tests using Node's built-in test runner
- Frontend and backend deployed as separate Render services

## Tech stack

| Area | Technologies |
|---|---|
| Frontend | React, Vite, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| Image hosting | Cloudinary, Multer |
| Testing | Node.js test runner, API checks, browser DevTools |
| Deployment | Render |
| Version control | Git, GitHub |

## Repository structure

The application is inside the `mern-shop/` directory.

```text
L4L-Website/
├── mern-shop/
│   ├── backend/
│   │   ├── config/          # Database connection
│   │   ├── controllers/     # API request handlers
│   │   ├── middleware/      # Authentication and authorization
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   ├── tests/           # Backend tests (if present in this checkout)
│   │   ├── server.js        # Express server entry point
│   │   └── package.json
│   ├── frontend/
│   │   ├── src/             # React application
│   │   ├── public/
│   │   └── package.json
│   └── package.json         # Root development scripts
└── README.md
```

## Run locally

### Prerequisites

- Node.js and npm
- MongoDB (local instance or MongoDB Atlas)
- Cloudinary credentials to test image uploads

### 1. Clone the repository

```bash
git clone https://github.com/ChrisVu16-git/L4L-Website.git
cd L4L-Website/mern-shop
```

### 2. Install dependencies

From the `mern-shop/` directory:

```bash
npm run install:all
```

### 3. Configure environment variables

Create `backend/.env` and configure the values for your environment:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/mern-shop
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

For MongoDB Atlas, replace the local `MONGODB_URI` with your Atlas connection string. Add the Cloudinary environment variables required by the backend's upload implementation. Never commit real secrets, database credentials, API keys, or production environment files.

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Vite environment variables are used at build time. If you change `VITE_API_URL` for the deployed frontend, rebuild and redeploy the frontend.

### 4. Start the development servers

From `mern-shop/`:

```bash
npm run dev
```

Default local URLs:
- Frontend: http://localhost:5173
- Backend health check: http://localhost:5000/api/health
- Products API: http://localhost:5000/api/products

The backend must connect to MongoDB for database-backed routes to work. The health endpoint alone does not prove database connectivity; also verify the products endpoint and backend logs.

## API overview

The API is mounted under `/api`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Basic API health response |
| POST | `/api/users/register` | Public | Register a user |
| POST | `/api/users/login` | Public | Authenticate and obtain a token |
| GET | `/api/users/profile` | Authenticated | Get the current user's profile |
| GET | `/api/products` | Public | List products |
| GET | `/api/products/categories` | Public | List product categories |
| GET | `/api/products/:id` | Public | Get a product by ID |
| POST | `/api/products` | Admin | Create a product |
| PUT | `/api/products/:id` | Admin | Update a product |
| DELETE | `/api/products/:id` | Admin | Delete a product |
| POST | `/api/products/:id/reviews` | Authenticated | Create a product review |

Admin routes require a valid JWT and admin authorization. Refer to the source code for exact request bodies and response formats.

## Deployment configuration

The deployed frontend and backend are separate Render services.

### Backend

Configure the backend service's environment variables in Render:

- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — strong secret used for JWT signing
- `CLIENT_URL` — frontend origin: `https://l4l-website-1.onrender.com`
- Cloudinary credentials required by the image-upload implementation

### Frontend

Set this Vite environment variable for the frontend service:

```env
VITE_API_URL=https://l4l-website.onrender.com/api
```

After changing a `VITE_*` variable, trigger a new frontend build/deployment. Keep secrets in Render environment settings rather than source control.

## Verification notes

The following checks have been reported as completed during release-readiness testing:

- Health endpoint returns HTTP 200
- Products API returns HTTP 200 and product records
- Storefront display and frontend-to-API connectivity
- Login/JWT and backend authorization checks
- Product CRUD and validation checks
- Cloudinary upload, image replacement, and safe cleanup checks
- Oversized and non-image upload rejection
- Public API response review, invalid-ID/error handling, and empty-search behavior
- Responsive layout and browser console review
- Render environment variables/logs and rollback/backup procedure review

These are test notes based on reported results, not a guarantee that every environment or future deployment will behave identically. Re-run relevant checks after changes.

## Known limitation

- **Payment processing is not currently deployed.** Do not describe payment processing as production-ready until it is implemented and tested in a safe sandbox environment.
- Deployment availability may depend on the hosting provider and service configuration.

## Future improvements

- Implement and test a sandbox payment flow before enabling real payments
- Add frontend and end-to-end automated tests
- Add CI checks for tests and production builds
- Document API request/response schemas
- Test the database backup and restore procedure

## License

No license is specified in this README. Add a license file if you intend to permit reuse of this project.
