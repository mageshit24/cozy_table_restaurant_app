require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { sequelize } = require('./src/models');
const { logger } = require('./src/utils/logger');
const { warmBlacklistCache } = require('./src/middleware/auth.middleware');

const app = express();

/* ── HTTP Request Logging (Morgan → Winston) ────────────────────────────── */
const morganStream = { write: (msg) => logger.http(msg.trim()) };
app.use(morgan(':method :url :status :response-time ms – :res[content-length]', { stream: morganStream }));

/* ── Security middleware ─────────────────────────────────────────────────── */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
/* ── Rate limiting ────────────────────────────────────────────────────────
 * PREVIOUSLY: one global limiter (100 req / 15 min) covered every request —
 * every menu image, every admin dashboard poll, every user, all sharing the
 * same tiny budget. A single admin dashboard left open (it polls stats every
 * few seconds) could exhaust it alone within minutes, then every real user
 * started getting 429s on ordinary browsing (switching menu categories,
 * submitting feedback, etc.) — which is exactly what was being reported.
 *
 * NOW: two tiers —
 *  - a strict `authLimiter` (see auth.routes.js) applies only to
 *    /api/auth/login + /api/auth/register, since brute-forcing credentials
 *    is the actual thing worth throttling.
 *  - `apiLimiter` below is generous, covering the rest of /api — enough
 *    headroom for normal SPA usage (polling dashboards, rapid filter
 *    switches) while still bounding abuse. Keyed per-IP either way
 *    (express-rate-limit's default), so one heavy user can't starve another.
 * Static /uploads is served BEFORE this limiter, so image loads never count
 * against a client's request budget. */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { message: 'Too many requests. Please slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ── Static file serving (uploaded menu images) — unthrottled ───────────── */
/*const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));*/

app.use('/api', apiLimiter);

/* ── Disable caching for all API responses ───────────────────────────────── */
/* Without this, browsers cache GET responses and return 304 Not Modified,    */
/* which causes Angular's HttpClient to never fire the `next` callback,       */
/* leaving components stuck on "Loading..." even though data arrived.         */
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

/* ── API Routes ──────────────────────────────────────────────────────────── */
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/reservations', require('./src/routes/reservation.routes'));
app.use('/api/menu', require('./src/routes/menu.routes'));
app.use('/api/cart', require('./src/routes/cart.routes'));
app.use('/api/orders', require('./src/routes/order.routes'));
app.use('/api/feedback', require('./src/routes/feedback.routes'));
app.use('/api/payment', require('./src/routes/payment.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));

/* ── Global Error Handler ─────────────────────────────────────────────────
 * Last-resort catch for anything a route/controller didn't handle itself.
 * Full detail always goes to the logs; the client only sees `err.message`
 * when it's an intentional, "operational" error (one that set `err.status`,
 * e.g. a validation or auth failure). A truly unexpected exception (status
 * undefined → 500) gets a generic message instead, so a stray bug can't leak
 * stack traces, file paths, or driver internals to the browser.               */
app.use((err, req, res, next) => {
  logger.error({
    event: 'UNHANDLED_ERROR',
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id || null,
  });

  const status = err.status || 500;
  const isOperational = Boolean(err.status); // deliberately thrown, e.g. `err.status = 400`
  const message = (isOperational || process.env.NODE_ENV !== 'production')
    ? (err.message || 'Internal server error')
    : 'Internal server error';

  return res.status(status).json({ message });
});

/* ── Sync DB → warm cache → start server ────────────────────────────────── */
sequelize.sync({ alter: false })
  .then(async () => {
    // Warm the in-memory token blacklist BEFORE accepting requests
    await warmBlacklistCache();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    logger.error({ event: 'DB_SYNC_FAILED', message: err.message, stack: err.stack });
    process.exit(1);
  });
