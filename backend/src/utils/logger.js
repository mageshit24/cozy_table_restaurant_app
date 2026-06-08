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

const path    = require('path');
const fs      = require('fs');
const winston = require('winston');

/* ── Ensure logs directory exists ──────────────────────────────────────────── */
const logsDir = path.join(__dirname, '../../../logs');
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
          const evt  = event  ? ` [${event}]`       : '';
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
    userId:    req.user?.id   || null,
    userRole:  req.user?.role || null,
    ip:        req.ip || req.connection?.remoteAddress,
    method:    req.method,
    url:       req.originalUrl,
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
    userId:    req.user?.id   || null,
    userRole:  req.user?.role || null,
    ip:        req.ip || req.connection?.remoteAddress,
    method:    req.method,
    url:       req.originalUrl,
    userAgent: req.headers['user-agent'] || null,
    errorMessage: err?.message || String(err),
    stack:     err?.stack || null,
    ...meta,
    message: `${event} – ${err?.message || err}`
  });
}

module.exports = { logger, logActivity, logError };
