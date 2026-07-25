/**
 * logger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised Winston logger shared across all controllers.
 *
 * Log files (backend/logs/):
 *   combined.log  – every level (info, warn, error, http)
 *   error.log     – errors only
 *   activity.log  – structured user-activity events (login, logout, operations)
 *
 * Usage:
 *   const { logger, logActivity, logError } = require('../utils/logger');
 *
 *   logActivity(req, 'LOGIN_SUCCESS', { email });
 *   logActivity(req, 'MENU_CREATE',  { itemId, name });
 *   logError(req, 'PAYMENT_FAIL',    err, { orderId });
 */

const path = require('path');
const fs = require('fs');
const winston = require('winston');

/* ── Ensure logs directory exists ──────────────────────────────────────────── */
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

/* ── Base logger ────────────────────────────────────────────────────────────── */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'activity.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
      )
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, event, userId }) => {
          const user = userId ? ` [user:${userId}]` : '';
          const evt = event ? ` [${event}]` : '';
          return `${timestamp} [${level}]${evt}${user} ${message}`;
        })
      )
    })
  ]
});

/* ── Helpers ─────────────────────────────────────────────────────────────────
 *  logActivity – records a successful/neutral user action
 *  logError    – records a failure with full error detail
 */

/**
 * Log a structured activity event.
 *
 * @param {import('express').Request} req   - Express request (for IP, user)
 * @param {string}                   event  - Short ALL_CAPS event name, e.g. 'LOGIN_SUCCESS'
 * @param {object}                   [meta] - Extra fields to attach to the log entry
 */
function logActivity(req, event, meta = {}) {
  logger.info({
    event,
    userId: req.user?.id || null,
    userRole: req.user?.role || null,
    ip: req.ip || req.connection?.remoteAddress,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'] || null,
    ...meta,
    message: `${event}${meta.email ? ` – ${meta.email}` : ''}`
  });
}

/**
 * Log a structured error event.
 *
 * @param {import('express').Request} req   - Express request
 * @param {string}                   event  - Short ALL_CAPS event name, e.g. 'LOGIN_ERROR'
 * @param {Error}                    err    - The caught error
 * @param {object}                   [meta] - Extra context fields
 */
function logError(req, event, err, meta = {}) {
  logger.error({
    event,
    userId: req.user?.id || null,
    userRole: req.user?.role || null,
    ip: req.ip || req.connection?.remoteAddress,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'] || null,
    errorMessage: err?.message || String(err),
    stack: err?.stack || null,
    ...meta,
    message: `${event} – ${err?.message || err}`
  });
}

/**
 * Send a safe error response to the client while logging full detail server-side.
 *
 * WHY: Returning `err.message` straight from Sequelize/MySQL/Node to the browser
 * leaks internals — column names, table names, constraint names, file paths —
 * which is a textbook "information exposure" vulnerability (CWE-209). This
 * helper keeps the full error in the logs (for debugging) but only ever sends
 * a generic, safe message to the client once NODE_ENV=production.
 *
 * In development the real `err.message` is still returned so you can debug
 * quickly from the browser/Postman without tailing log files.
 *
 * @param {import('express').Response} res
 * @param {import('express').Request}  req
 * @param {number} status         - HTTP status code (e.g. 500)
 * @param {string} publicMessage  - Safe, user-facing summary (e.g. "Error fetching menu")
 * @param {string} event          - Short ALL_CAPS event name for the log entry
 * @param {Error}  err            - The caught error (full detail goes to logs only)
 */
function sendError(res, req, status, publicMessage, event, err) {
  logError(req, event, err);

  const isProd = process.env.NODE_ENV === 'production';
  return res.status(status).json({
    message: publicMessage,
    // Only leak the raw driver/ORM error message outside production.
    ...(isProd ? {} : { error: err?.message || String(err) })
  });
}

/**
 * Returns the raw error message outside production, or `undefined` in
 * production so it's omitted from the JSON response entirely. Use this at
 * call sites that already call logError() themselves and just need the
 * client-facing payload sanitized, e.g.:
 *
 *   logError(req, 'MENU_CREATE_ERROR', err, { name: req.body?.name });
 *   return res.status(500).json({ message: 'Error creating menu item', error: safeError(err) });
 */
function safeError(err) {
  return process.env.NODE_ENV === 'production' ? undefined : (err?.message || String(err));
}

module.exports = { logger, logActivity, logError, sendError, safeError };
