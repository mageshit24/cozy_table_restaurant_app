/**
 * reservation.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles table reservations: create, list (all/mine), availability check,
 * update, and delete.
 *
 * Hardening applied in this pass:
 *  • Every catch block now logs via logError (previously errors were silently
 *    swallowed — a failed query left zero trace in the logs).
 *  • Client-facing responses use sendError() so the raw Sequelize/MySQL error
 *    message is only echoed back outside production (CWE-209 fix).
 *  • updateReservation now whitelists editable fields instead of passing the
 *    whole req.body to .update() — previously a non-admin could not change
 *    `status`, but COULD still overwrite `userId` on someone else's booking
 *    by including it in the payload (a mass-assignment / IDOR gap).
 */

const { Reservation, User } = require('../models');
const { logActivity, sendError } = require('../utils/logger');

// ── Create Reservation ─────────────────────────────────────────────
exports.createReservation = async (req, res) => {
  try {
    const { date, time, guests } = req.body;

    if (!date || !time || !guests) {
      return res.status(400).json({
        message: 'Date, time, and guests are required'
      });
    }

    const existing = await Reservation.findOne({
      where: { date, time }
    });

    if (existing) {
      return res.status(400).json({
        message: 'This slot is already booked'
      });
    }

    const reservation = await Reservation.create({
      date,
      time,
      guests,
      userId: req.user.id,
      status: 'pending'
    });

    logActivity(req, 'RESERVATION_CREATE', { reservationId: reservation.id, date, time, guests });

    return res.status(201).json(reservation);

  } catch (err) {
    return sendError(res, req, 500, 'Error creating reservation', 'RESERVATION_CREATE_ERROR', err);
  }
};

// ── Get Reservations (admin: all, customer: own) ────────────────────
exports.getReservations = async (req, res) => {
  try {
    const where = {};

    if (req.user.role !== 'admin') {
      where.userId = req.user.id;
    }

    const reservations = await Reservation.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json(reservations);

  } catch (err) {
    return sendError(res, req, 500, 'Error fetching reservations', 'RESERVATION_FETCH_ERROR', err);
  }
};

// ── Get My Reservations ───────────────────────────────────────────
exports.getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.findAll({
      where: {
        userId: req.user.id
      },
      order: [['createdAt', 'DESC']]
    });

    return res.json(reservations);

  } catch (err) {
    return sendError(res, req, 500, 'Error fetching reservations', 'RESERVATION_MY_FETCH_ERROR', err);
  }
};

// ── Check Availability ────────────────────────────────────────────
exports.checkAvailability = async (req, res) => {
  try {
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required' });
    }

    const existing = await Reservation.findOne({
      where: { date, time }
    });

    return res.json({
      available: !existing
    });

  } catch (err) {
    return sendError(res, req, 500, 'Error checking availability', 'RESERVATION_AVAILABILITY_ERROR', err);
  }
};

// ── Update Reservation ────────────────────────────────────────────
exports.updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        message: 'Reservation not found'
      });
    }

    if (
      req.user.role !== 'admin' &&
      reservation.userId !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Forbidden'
      });
    }

    /*
     * Whitelist editable fields instead of `reservation.update(req.body)`.
     * Passing the raw body straight to Sequelize let any authenticated
     * caller override columns that were never meant to be client-writable
     * (e.g. `userId`, `id`, `createdAt`) — classic mass-assignment risk.
     */
    const editable = ['date', 'time', 'guests'];
    if (req.user.role === 'admin') editable.push('status');

    const updates = {};
    for (const field of editable) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    /*
     * If a customer (not admin) changes date/time/guests on a reservation
     * that was already confirmed, the new slot hasn't actually been reviewed
     * by staff — leaving `status` as 'confirmed' would silently confirm a
     * booking nobody checked. Bump it back to 'pending' so it re-enters the
     * admin review queue. Admins changing their own `status` field above
     * are unaffected — this only fires for the customer-edit path.
     *
     * NOTE: 'confirmed' (not 'approved') is the actual value this app uses —
     * see admin/reservations.html's status dropdown. An earlier version of
     * this check compared against 'approved', which is never the real
     * stored value, so the reset silently never fired.
     */
    const isReschedule = ['date', 'time', 'guests'].some(f => updates[f] !== undefined);
    if (req.user.role !== 'admin' && isReschedule && reservation.status === 'confirmed') {
      updates.status = 'pending';
    }

    await reservation.update(updates);

    logActivity(req, 'RESERVATION_UPDATE', { reservationId: reservation.id, updates });

    return res.json({
      message: 'Reservation updated',
      reservation
    });

  } catch (err) {
    return sendError(res, req, 500, 'Error updating reservation', 'RESERVATION_UPDATE_ERROR', err);
  }
};

// ── Delete Reservation ────────────────────────────────────────────
exports.deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        message: 'Reservation not found'
      });
    }

    if (
      req.user.role !== 'admin' &&
      reservation.userId !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Forbidden'
      });
    }

    await reservation.destroy();

    logActivity(req, 'RESERVATION_DELETE', { reservationId: req.params.id });

    return res.json({
      message: 'Reservation deleted'
    });

  } catch (err) {
    return sendError(res, req, 500, 'Error deleting reservation', 'RESERVATION_DELETE_ERROR', err);
  }
};
