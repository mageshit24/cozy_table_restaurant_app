const jwt            = require('jsonwebtoken');
const TokenBlacklist = require('../models/tokenBlacklist.model');

/**
 * In-memory blacklist cache.
 *
 * WHY: TokenBlacklist.findOne() runs a MySQL query on EVERY authenticated
 * request. With 15+ protected routes each triggering their own DB round-trip,
 * every page load adds ~50-200ms of unnecessary latency.
 *
 * FIX: Warm a JS Set from the DB at startup, then check the Set in-memory
 * (microseconds). The Set is updated immediately on logout so it's always
 * consistent — no stale entries possible.
 */
const blacklistedTokens = new Set();

/**
 * Warm the cache once at startup.
 * Called from server.js after sequelize.sync() so the table is guaranteed
 * to exist before we query it.
 */
async function warmBlacklistCache() {
  try {
    const rows = await TokenBlacklist.findAll({ attributes: ['token'] });
    rows.forEach(r => blacklistedTokens.add(r.token));
    console.log(`[auth] Blacklist cache warmed — ${blacklistedTokens.size} token(s) loaded`);
  } catch (err) {
    console.warn('[auth] Could not warm blacklist cache:', err.message);
  }
}

/**
 * Add a token to both the DB and the in-memory cache.
 * Used by auth.controller.js → logout.
 */
async function blacklistToken(token) {
  blacklistedTokens.add(token);
  await TokenBlacklist.findOrCreate({ where: { token } });
}

/**
 * Auth middleware — O(1) Set lookup, zero DB queries per request.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // In-memory check — no DB round-trip
    if (blacklistedTokens.has(token)) {
      return res.status(401).json({ message: 'Token has been invalidated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
module.exports.warmBlacklistCache = warmBlacklistCache;
module.exports.blacklistToken     = blacklistToken;
