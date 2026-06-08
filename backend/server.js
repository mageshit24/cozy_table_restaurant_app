require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan    = require('morgan');
const path      = require('path');
const fs        = require('fs');

const { sequelize } = require('./src/models');
const { logger }    = require('./src/utils/logger');
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
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

/* ── Static file serving (uploaded menu images) ──────────────────────────── */
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

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
app.use('/api/auth',         require('./src/routes/auth.routes'));
app.use('/api/reservations', require('./src/routes/reservation.routes'));
app.use('/api/menu',         require('./src/routes/menu.routes'));
app.use('/api/cart',         require('./src/routes/cart.routes'));
app.use('/api/orders',       require('./src/routes/order.routes'));
app.use('/api/feedback',     require('./src/routes/feedback.routes'));
app.use('/api/payment',      require('./src/routes/payment.routes'));
app.use('/api/admin',        require('./src/routes/admin.routes'));

/* ── Global Error Handler ────────────────────────────────────────────────── */
app.use((err, req, res, next) => {
  logger.error({
    event:   'UNHANDLED_ERROR',
    message: err.message,
    stack:   err.stack,
    method:  req.method,
    url:     req.originalUrl,
    userId:  req.user?.id || null,
  });
  return res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
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
