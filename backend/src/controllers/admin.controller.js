/**
 * admin.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Improvements vs original:
 *  • Full structured Winston logging
 */

const { Order, Reservation, Feedback, User, sequelize } = require('../models');
const { logActivity, logError } = require('../utils/logger');

exports.getStats = async (req, res) => {
  try {
    const [totalOrders, totalReservations, totalFeedback, totalUsers, revenueResult] =
      await Promise.all([
        Order.count(),
        Reservation.count(),
        Feedback.count(),
        User.count({ where: { role: 'customer' } }),
        Order.findOne({
          attributes: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']],
          where: { status: 'delivered' },
          raw: true
        })
      ]);

    const totalRevenue = parseFloat(revenueResult?.revenue || 0).toFixed(2);

    logActivity(req, 'ADMIN_STATS_FETCH', { totalOrders, totalReservations, totalUsers });

    return res.json({ totalOrders, totalReservations, totalFeedback, totalUsers, totalRevenue });
  } catch (err) {
    logError(req, 'ADMIN_STATS_ERROR', err);
    return res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
};
