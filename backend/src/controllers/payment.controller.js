/**
 * payment.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Improvements vs original:
 *  • Full structured Winston logging for every payment attempt (success/failure)
 *  • Guard: prevents double-payment on the same order
 *  • Guard: only the order owner can pay for their own order
 */

const { Payment, Order } = require('../models');
const { logActivity, logError } = require('../utils/logger');

exports.processPayment = async (req, res) => {
  const { orderId, method, cardNumber, upiId } = req.body;
  try {
    /* ── Validate orderId ────────────────────────────────────────────────── */
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      logActivity(req, 'PAYMENT_ORDER_NOT_FOUND', { orderId });
      return res.status(404).json({ message: 'Order not found' });
    }

    /* ── Guard: only the order owner may pay ────────────────────────────── */
    if (order.userId !== req.user.id) {
      logActivity(req, 'PAYMENT_UNAUTHORIZED', { orderId, ownerId: order.userId });
      return res.status(403).json({ message: 'Not authorised to pay for this order' });
    }

    /* ── Guard: prevent double-payment ──────────────────────────────────── */
    const existingPayment = await Payment.findOne({
      where: { orderId, status: 'Success' }
    });
    if (existingPayment) {
      logActivity(req, 'PAYMENT_ALREADY_PAID', { orderId, paymentId: existingPayment.id });
      return res.status(409).json({ message: 'This order has already been paid.' });
    }

    /* ── Validate method ─────────────────────────────────────────────────── */
    const validMethods = ['card', 'upi', 'cod'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    /* ── Card validation ─────────────────────────────────────────────────── */
    if (method === 'card') {
      if (!cardNumber) return res.status(400).json({ message: 'Card number is required' });
      if (!/^\d{16}$/.test(cardNumber))
        return res.status(400).json({ message: 'Invalid card format' });
    }

    /* ── UPI validation ──────────────────────────────────────────────────── */
    if (method === 'upi') {
      if (!upiId) return res.status(400).json({ message: 'UPI ID is required' });
      if (!/^[\w.\-]+@[\w.\-]+$/.test(upiId))
        return res.status(400).json({ message: 'Invalid UPI ID' });
    }

    /* ── Create payment record ───────────────────────────────────────────── */
    const payment = await Payment.create({ orderId, method, status: 'Success' });

    /* ── Advance order status ────────────────────────────────────────────── */
    await order.update({ status: 'preparing' });

    logActivity(req, 'PAYMENT_SUCCESS', {
      orderId,
      paymentId:   payment.id,
      method,
      totalAmount: order.totalAmount
    });

    return res.status(201).json({ message: 'Payment successful', payment });
  } catch (err) {
    logError(req, 'PAYMENT_ERROR', err, { orderId });
    return res.status(500).json({
      message: 'Payment processing failed',
      error:   err.message
    });
  }
};
