/**
 * order.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes & improvements vs original:
 *
 *  BUG FIX – Status changeable after payment / delivery:
 *    updateStatus now enforces a state-machine:
 *      • An order whose status is already 'delivered' or 'cancelled' cannot
 *        be changed (terminal states).
 *      • An order that has a successful Payment record cannot be rolled back
 *        to 'pending' – payment has been accepted.
 *    These guards prevent admin (or a rogue request) from changing a
 *    delivered/paid order back to pending.
 *
 *  • Full structured Winston logging for every operation and error
 */

const { Order, OrderItem, Cart, Menu, Payment } = require('../models');
const { logActivity, logError } = require('../utils/logger');

const VALID_STATUSES = ['pending', 'preparing', 'delivered', 'cancelled'];

/** Terminal states – once reached the order cannot be updated */
const TERMINAL_STATES = ['delivered', 'cancelled'];

/**
 * Allowed transitions map.
 * Key = current status → Value = array of statuses it may move to.
 * Admin cannot regress a paid order back to pending.
 */
const ALLOWED_TRANSITIONS = {
  pending:   ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
  delivered: [],   // terminal
  cancelled: []    // terminal
};

/* ─────────────────── PLACE ORDER ──────────────────────────────────────── */

exports.placeOrder = async (req, res, next) => {
  try {
    const cartItems = await Cart.findAll({
      where:   { userId: req.user.id },
      include: [{ model: Menu }]
    });

    if (!cartItems.length) {
      logActivity(req, 'ORDER_PLACE_EMPTY_CART', {});
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const total = cartItems.reduce(
      (sum, item) => sum + item.quantity * item.Menu.price, 0
    );

    const order = await Order.create({
      userId:      req.user.id,
      totalAmount: total,
      status:      'pending'
    });

    await Promise.all(
      cartItems.map(item =>
        OrderItem.create({
          orderId:  order.id,
          menuId:   item.menuId,
          quantity: item.quantity,
          price:    item.Menu.price
        })
      )
    );

    await Cart.destroy({ where: { userId: req.user.id } });

    const fullOrder = await Order.findByPk(order.id, {
      include: [{
        model: OrderItem,
        include: [{ model: Menu, attributes: ['id', 'name', 'price', 'image'] }]
      }]
    });

    logActivity(req, 'ORDER_PLACED', {
      orderId:     order.id,
      totalAmount: total,
      itemCount:   cartItems.length
    });

    return res.status(201).json({ message: 'Order placed successfully', order: fullOrder });
  } catch (err) {
    logError(req, 'ORDER_PLACE_ERROR', err);
    next(err);
  }
};

/* ─────────────────── GET ORDERS ────────────────────────────────────────── */

exports.getOrders = async (req, res, next) => {
  try {
    const where = req.user.role === 'admin' ? {} : { userId: req.user.id };

    const orders = await Order.findAll({
      where,
      include: [{
        model: OrderItem,
        include: [{ model: Menu, attributes: ['id', 'name', 'price', 'image'] }]
      }],
      order: [['createdAt', 'DESC']]
    });

    logActivity(req, 'ORDERS_FETCH', { count: orders.length });
    return res.json(orders);
  } catch (err) {
    logError(req, 'ORDERS_FETCH_ERROR', err);
    next(err);
  }
};

/* ─────────────────── UPDATE STATUS ────────────────────────────────────── */

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    /* Validate requested status value */
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    /* ── BUG FIX: Block changes on terminal states ─────────────────────────
     * Once an order is delivered or cancelled it cannot be changed.
     */
    if (TERMINAL_STATES.includes(order.status)) {
      logActivity(req, 'ORDER_STATUS_BLOCKED_TERMINAL', {
        orderId:    order.id,
        fromStatus: order.status,
        toStatus:   status
      });
      return res.status(409).json({
        message: `Order is already '${order.status}' and cannot be changed.`
      });
    }

    /* ── BUG FIX: Block regression after successful payment ────────────────
     * If the order has been paid, do not allow it to revert to 'pending'.
     */
    if (status === 'pending') {
      const paidPayment = await Payment.findOne({
        where: { orderId: order.id, status: 'Success' }
      });
      if (paidPayment) {
        logActivity(req, 'ORDER_STATUS_BLOCKED_PAID', {
          orderId:   order.id,
          paymentId: paidPayment.id,
          toStatus:  status
        });
        return res.status(409).json({
          message: 'Cannot revert order to pending after successful payment.'
        });
      }
    }

    /* ── Enforce allowed transitions ───────────────────────────────────────
     * This prevents skipping states (e.g. pending → delivered directly).
     */
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      logActivity(req, 'ORDER_STATUS_INVALID_TRANSITION', {
        orderId:    order.id,
        fromStatus: order.status,
        toStatus:   status,
        allowed
      });
      return res.status(409).json({
        message: `Cannot change order from '${order.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}.`
      });
    }

    const previousStatus = order.status;
    await order.update({ status });

    logActivity(req, 'ORDER_STATUS_UPDATED', {
      orderId:        order.id,
      previousStatus,
      newStatus:      status
    });

    return res.json({ message: 'Order status updated', order });
  } catch (err) {
    logError(req, 'ORDER_STATUS_UPDATE_ERROR', err, { orderId: req.params.id });
    next(err);
  }
};
