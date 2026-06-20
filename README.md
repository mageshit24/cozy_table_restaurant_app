# 🍽️ The Cozy Table — Restaurant Management Web App

A full-stack restaurant management system with separate **customer** and **admin** experiences — online menu browsing, cart & ordering, table reservations, payments, and feedback, backed by a secure JWT-authenticated REST API.

> 🎓 Internship Trainng Project

---

## 📖 Overview

The Cozy Table digitizes the day-to-day operations of a restaurant into a single web platform:

- **Customers** can browse the menu, add items to a cart, place orders, track order status, reserve a table, make payments, and leave feedback.
- **Admins** get a dedicated dashboard to manage the menu (with image uploads), view and update reservations, process orders through their lifecycle, view customer feedback, and see restaurant-wide stats.

The app is built as a **monorepo**: an Angular frontend and a Node.js/Express backend in one repository, communicating over a versioned REST API.

---

## 🏗️ Architecture

```
┌──────────────────────────┐         REST API (JWT)        ┌──────────────────────────┐
│   Angular Frontend        │ ─────────────────────────────▶│   Express Backend         │
│   (Customer + Admin UI)   │ ◀───────────────────────────── │   (Node.js + Sequelize)   │
└──────────────────────────┘                                └─────────────┬────────────┘
                                                                            │
                                                                            ▼
                                                              ┌──────────────────────────┐
                                                              │   MySQL Database          │
                                                              │   (restro_hub)            │
                                                              └──────────────────────────┘
```

- **Frontend (Angular 21):** Standalone components, route guards for auth/admin, an HTTP interceptor that attaches the JWT to every request.
- **Backend (Express 5 + Sequelize):** Layered into routes → controllers → models, with middleware for auth, role-based access control, rate limiting, and structured logging.
- **Database (MySQL):** Relational schema covering users, menu, cart, orders, order items, reservations, payments, feedback, and a token blacklist for logout.

---

## ✨ Features

### Customer
- 🔐 Register / login (JWT-based auth), profile management, password change
- 🍕 Browse the menu with images
- 🛒 Add to cart, update quantities, clear cart
- 📦 Place orders and track order history/status
- 📅 Check table availability and create/manage reservations
- 💳 Make payments for orders
- ⭐ Submit feedback/ratings

### Admin
- 📊 Dashboard with restaurant-wide stats
- 🍽️ Full menu CRUD with image upload (Multer)
- 📅 View and manage all reservations
- 📦 Manage orders through a controlled status lifecycle (no illegal state transitions)
- 💬 View customer feedback (sortable, filterable by rating)

### Platform / Security
- 🔑 JWT authentication with role-based route guards (customer vs admin)
- 🚫 Token blacklist on logout, served from an in-memory cache (warmed at startup) to avoid a DB hit on every authenticated request
- 🛡️ `helmet`, `cors`, and `express-rate-limit` for baseline API hardening
- 📝 Structured logging via Winston (HTTP access logs piped through Morgan)
- 🌐 No-cache headers on all `/api` responses to prevent stale 304 responses from leaving the Angular UI stuck on "Loading…"

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21 (standalone components), TypeScript, RxJS |
| Backend | Node.js, Express 5 |
| ORM | Sequelize |
| Database | MySQL (`restro_hub`) |
| Auth | JSON Web Tokens (jsonwebtoken), bcrypt |
| File uploads | Multer |
| Security middleware | helmet, cors, express-rate-limit |
| Logging | winston, morgan |
| Tooling | nodemon, Angular CLI |

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── server.js                  # App entrypoint: middleware, routes, DB sync
│   └── src/
│       ├── config/db.js           # Sequelize MySQL connection
│       ├── controllers/           # auth, menu, cart, order, reservation,
│       │                          # payment, feedback, admin
│       ├── middleware/            # JWT auth (+ blacklist cache), role guard
│       ├── models/                # Sequelize models + associations (index.js)
│       ├── routes/                # REST endpoints per resource
│       └── utils/logger.js        # Winston structured logger
│
└── frontend/
    └── src/app/
        ├── auth/                  # Login, Register
        ├── customer/              # Dashboard, Menu, Cart, Orders,
        │                          # Reservation, Payment, Profile, Feedback
        ├── admin/                 # Dashboard, Menu, Orders, Reservations, Feedback
        ├── core/
        │   ├── guards/             # auth-guard, admin-guard
        │   └── interceptors/       # token-interceptor (attaches JWT)
        ├── services/               # auth, cart, menu, order, reservation, feedback
        └── shared/                 # navbar, footer
```

---

## 🔌 API Overview

| Resource | Base path | Notes |
|---|---|---|
| Auth | `/api/auth` | register, login, profile (get/update), change-password, logout |
| Menu | `/api/menu` | public GET; admin-only create/update/delete with image upload |
| Cart | `/api/cart` | per-user cart CRUD |
| Orders | `/api/orders` | place/list orders; admin-only status updates |
| Reservations | `/api/reservations` | availability check, customer's own reservations, admin view/manage |
| Payment | `/api/payment` | process payment for an order |
| Feedback | `/api/feedback` | customer submits; admin views (sortable/filterable) |
| Admin | `/api/admin` | restaurant-wide stats (admin-only) |

All protected routes require a `Bearer` JWT in the `Authorization` header. Admin-only routes are additionally gated by a role middleware.

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (LTS)
- MySQL Server
- Angular CLI (`npm install -g @angular/cli`)

### 1. Clone the repo
```bash
git clone https://github.com/mageshit24/cozy_table_restaurant_app.git
cd cozy_table_restaurant_app
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create a `backend/.env` file (not committed — already gitignored):
```env
PORT=5000
DB_HOST=localhost
DB_NAME=restro_hub
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:4200
```

Create the MySQL database:
```sql
CREATE DATABASE restro_hub;
```

Start the backend (auto-creates/syncs tables on boot):
```bash
npm run dev      # nodemon, auto-restart on changes
# or
npm start
```
The API runs on `http://localhost:5000`.

### 3. Frontend setup
```bash
cd ../frontend
npm install
npm start
```
The app runs on `http://localhost:4200` and proxies API calls to the backend (see `proxyconfig.json`).

> ℹ️ There's no admin registration UI — promote a user to admin directly in MySQL (`UPDATE users SET role = 'admin' WHERE id = ...;`) or via a one-off API call.

---

## 🔒 Security Notes

- Database and JWT credentials are loaded from `backend/.env`, which is excluded from version control — never commit real credentials.
- Rate limiting (100 requests / 15 min per IP) is applied globally; tune this for production traffic.
- File uploads are restricted to image MIME types and capped at 5MB.

---

## 🚀 Future Improvements

- Admin UI for promoting/demoting user roles (currently DB-only)
- Order status notifications (email/SMS) to customers
- Pagination on menu, orders, and feedback admin views
- Automated tests for backend controllers (currently frontend-only spec files exist)
- Dockerize backend + frontend for one-command local setup
- CI pipeline for build/test on push

---

## 👤 Author

**Magesh Hariram K**
Final Year Major Project — Full-Stack Restaurant Management System

📇 [LinkedIn](https://www.linkedin.com/in/magesh-hariram-k-6011132a4)

---

## 📄 License

ISC (as declared in `backend/package.json`). Consider adding a top-level `LICENSE` file for clarity.
