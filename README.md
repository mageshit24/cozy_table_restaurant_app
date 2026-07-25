# 🍽️ The Cozy Table - Restaurant Management Web App

A full-stack restaurant management system with separate **customer** and **admin** experiences - online menu browsing, cart & ordering, table reservations, payments, and feedback, backed by a secure JWT-authenticated REST API.

> 🎓 Internship Training Project

---

## 📖 Overview

The Cozy Table digitizes the day-to-day operations of a restaurant into a single web platform:

- **Customers** can browse the menu, add items to a cart, place orders, track order status, reserve a table, make payments, and leave feedback.
- **Admins** get a dedicated dashboard to manage the menu (with image uploads), view and update reservations, process orders through their lifecycle, view customer feedback, and see restaurant-wide stats.

The app is built as a **monorepo**: an Angular frontend and a Node.js/Express backend in one repository, communicating over a versioned REST API.

---

## 🏗️ Architecture

```
          ┌──────────────────────────────┐
          │       Angular Frontend       │
          │    (Customer + Admin UI)     │
          └──────────────────────────────┘
                          │
                REST API (JWT, HTTPS)
                          ▼
          ┌──────────────────────────────┐
          │       Express Backend        │
          │    (Node.js + Sequelize)     │
          └──────────────────────────────┘
                          │
                    Sequelize ORM
                          ▼
          ┌──────────────────────────────┐
          │        MySQL Database        │
          │         (restro_hub)         │
          └──────────────────────────────┘
```

- **Frontend (Angular 21):** Standalone components, route guards for auth/admin (which also check token expiry, not just presence), and an HTTP interceptor that attaches the JWT to every request and automatically logs the user out and redirects to `/login` on a 401 response (e.g. an expired or blacklisted token).
- **Backend (Express 5 + Sequelize):** Layered into routes → controllers → models, with middleware for auth, role-based access control, tiered rate limiting, and structured logging.
- **Database (MySQL):** Relational schema covering users, menu, cart, orders, order items, reservations, payments, feedback, and a token blacklist for logout. Menu item images are stored directly in the database as binary data (not on disk) and served back as base64 data URIs.

---

## ✨ Features

### Customer
- 🔐 Register / login (JWT-based auth), profile management, password change
- 🍕 Browse the menu with images
- 🛒 Add to cart, update quantities, clear cart
- 📦 Place orders and track order history/status
- 📅 Check table availability and create/manage reservations - editing an already-confirmed reservation automatically reverts its status to `pending` for staff re-review
- 💳 Make payments for orders
- ⭐ Submit feedback/ratings

### Admin
- 📊 Dashboard with restaurant-wide stats
- 🍽️ Full menu CRUD with image upload (Multer, stored as binary data in MySQL)
- 📅 View and manage all reservations
- 📦 Manage orders through a controlled status lifecycle (no illegal state transitions)
- 💬 View customer feedback (sortable, filterable by rating)

### Platform / Security
- 🔑 JWT authentication with role-based route guards (customer vs admin), including client-side expiry checks
- 🚫 Token blacklist on logout, served from an in-memory cache (warmed at startup) to avoid a DB hit on every authenticated request
- 🛡️ `helmet`, `cors`, and tiered `express-rate-limit`ing for baseline API hardening
- 📝 Structured logging via Winston (HTTP access logs piped through Morgan), written to `backend/logs/`
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
| File uploads | Multer (memory storage → stored as BLOB in MySQL) |
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
        │   └── interceptors/       # token-interceptor (attaches JWT, handles 401)
        ├── services/               # auth, cart, menu, order, reservation, feedback
        └── shared/                 # navbar, footer
```

---

## 🔌 API Overview

| Resource | Base path | Notes |
|---|---|---|
| Auth | `/api/auth` | register, login (rate-limited: 20 req/15 min), profile (get/update), change-password (`PUT`), logout |
| Menu | `/api/menu` | public GET; admin-only create/update/delete with image upload, stored in DB |
| Cart | `/api/cart` | per-user cart CRUD |
| Orders | `/api/orders` | place/list orders; admin-only status updates |
| Reservations | `/api/reservations` | availability check, customer's own reservations (edits to a confirmed booking reset it to `pending`), admin view/manage |
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

Create a `backend/.env` file (not committed - already gitignored):
```env
PORT=5000
DB_HOST=localhost
DB_NAME=your_db_name
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:4200
```

Create the MySQL database:
```sql
CREATE DATABASE your_db_name;
```

Start the backend (auto-creates/syncs tables on boot):
```bash
npm run dev      # nodemon, auto-restart on changes
# or
npm start
```
The API runs on `http://localhost:5000`.

> ⚠️ **Upgrading an existing local DB from an older clone?** The `Menus.image`
> column changed from a filename string to a binary BLOB, and Sequelize's
> `sync({ alter: false })` never auto-migrates existing columns. Either drop
> the `Menus` table and let it recreate on next boot, or run:
> ```sql
> ALTER TABLE Menus MODIFY image LONGBLOB NULL, ADD COLUMN imageMimeType VARCHAR(255) NULL;
> ```
> Existing menu rows will need their photos re-uploaded via the admin panel either way, since the old value was a filename, not real image data.

### 3. Frontend setup
```bash
cd ../frontend
npm install
npm start
```
The app runs on `http://localhost:4200` and proxies API calls to the backend (see `proxyconfig.json`).

> ℹ️ There's no admin registration UI - promote a user to admin directly in MySQL (`UPDATE Users SET role = 'admin' WHERE email = '...';`), then log out and back in so a fresh JWT picks up the new role.

---

## 📸 Screenshots

### 🔐 Authentication

#### Login Page
<img width="1917" height="973" alt="Screenshot 2026-07-26 012057" src="https://github.com/user-attachments/assets/24940f5a-d3eb-4668-ac7c-5202640901a8" />

#### Registration Page
<img width="1917" height="970" alt="Screenshot 2026-07-26 012114" src="https://github.com/user-attachments/assets/d78f7230-3b0e-495b-bac4-d20601b46b38" />

---

### 👨‍🍳 Customer Experience

#### Customer Dashboard
<img width="1917" height="965" alt="Screenshot 2026-07-26 011136" src="https://github.com/user-attachments/assets/b32ab05b-dc58-45ec-b062-90f6f68381ab" />

#### Browse Menu
<img width="1917" height="972" alt="Screenshot 2026-07-26 011115" src="https://github.com/user-attachments/assets/320bc5e5-c4f9-4d6f-b883-90ec73eb2998" />

#### Shopping Cart
<img width="1915" height="981" alt="Screenshot 2026-07-26 011342" src="https://github.com/user-attachments/assets/d90faeff-f7c4-492c-824c-a4698a015be0" />

#### My Orders
<img width="1917" height="970" alt="Screenshot 2026-07-26 011211" src="https://github.com/user-attachments/assets/f0e077c8-123f-4f42-a851-303a38ab2862" />

#### Table Reservation
<img width="1917" height="971" alt="Screenshot 2026-07-26 011151" src="https://github.com/user-attachments/assets/6f36ae7d-3992-4ddd-8789-568e23776b7d" />

#### Payment Page
<img width="1917" height="972" alt="Screenshot 2026-07-26 011527" src="https://github.com/user-attachments/assets/840bc0d8-0964-436f-97c1-0d1cc25481e8" />
<img width="1917" height="926" alt="Screenshot 2026-07-26 011548" src="https://github.com/user-attachments/assets/4602f323-131a-4583-9b78-2a3fa05dd644" />

#### Feedback Submission
<img width="1917" height="972" alt="Screenshot 2026-07-26 011250" src="https://github.com/user-attachments/assets/c5648772-0d39-4616-a0f8-78e5080003f8" />

#### Profile
<img width="1917" height="917" alt="Screenshot 2026-07-26 011311" src="https://github.com/user-attachments/assets/a9cd1ef0-3337-46c6-8dde-f32b076121cf" />

---

### 🛠️ Admin Experience

#### Admin Dashboard
<img width="1917" height="970" alt="Screenshot 2026-07-26 012603" src="https://github.com/user-attachments/assets/f0275ccf-2ca2-462f-860f-e4327bd6741f" />

#### Add Menu Item
<img width="1917" height="965" alt="Screenshot 2026-07-26 011729" src="https://github.com/user-attachments/assets/f1cfcfdc-27d8-455b-bf58-92e5983c32b9" />

#### Menu Management
<img width="1917" height="967" alt="Screenshot 2026-07-26 011743" src="https://github.com/user-attachments/assets/27708e79-ef32-4b71-81db-47387a45aeda" />
<img width="1917" height="980" alt="Screenshot 2026-07-26 011818" src="https://github.com/user-attachments/assets/16868670-ab8a-4cd8-a427-1c5a00a1536c" />

#### Order Management
<img width="1917" height="967" alt="Screenshot 2026-07-26 011940" src="https://github.com/user-attachments/assets/ae13bc5c-6b1a-479a-9335-b814ec0dbae6" />

#### Reservation Management
<img width="1917" height="967" alt="Screenshot 2026-07-26 011905" src="https://github.com/user-attachments/assets/fef37709-b6ac-4430-af48-fc0948387219" />

#### Customer Feedback
<img width="1917" height="972" alt="Screenshot 2026-07-26 012000" src="https://github.com/user-attachments/assets/1969c846-590e-4239-ab58-4d1a2860bd2b" />

---

## 🔒 Security Notes

- Database and JWT credentials are loaded from `backend/.env`, which is excluded from version control - never commit real credentials.
- Rate limiting is tiered: `/api/auth/login` and `/api/auth/register` are limited to 20 requests/15 min per IP (credential brute-forcing is the actual risk there); the rest of `/api` allows 300 requests/min per IP, generous enough for normal SPA usage (dashboard polling, rapid filter switching) without leaving the whole API sharing one easily-exhausted budget. Static asset/image requests aren't rate-limited at all.
- File uploads are restricted to image MIME types and capped at 5MB, held in memory only long enough to write to the database (never touch disk).

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
Internship Training Project - Full-Stack Restaurant Management System

📇 [LinkedIn](https://www.linkedin.com/in/magesh-hariram-k-6011132a4)

---

## 📄 License

ISC (as declared in `backend/package.json`). Consider adding a top-level `LICENSE` file for clarity.
