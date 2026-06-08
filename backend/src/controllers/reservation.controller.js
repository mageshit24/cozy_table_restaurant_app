/**
 * reservation.controller.js
 */

const { Reservation, User } = require('../models');

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

    return res.status(201).json(reservation);

  } catch (err) {

    return res.status(500).json({
      message: 'Error creating reservation',
      error: err.message
    });

  }
};

// ── Get Reservations ──────────────────────────────────────────────
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

    return res.status(500).json({
      message: 'Error fetching reservations',
      error: err.message
    });

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

    return res.status(500).json({
      message: 'Error fetching reservations',
      error: err.message
    });

  }
};

// ── Check Availability ────────────────────────────────────────────
exports.checkAvailability = async (req, res) => {

  try {

    const { date, time } = req.body;

    const existing = await Reservation.findOne({
      where: { date, time }
    });

    return res.json({
      available: !existing
    });

  } catch (err) {

    return res.status(500).json({
      message: 'Error checking availability',
      error: err.message
    });

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

    if (req.user.role !== 'admin') {
      delete req.body.status;
    }

    await reservation.update(req.body);

    return res.json({
      message: 'Reservation updated',
      reservation
    });

  } catch (err) {

    return res.status(500).json({
      message: 'Error updating reservation',
      error: err.message
    });

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

    return res.json({
      message: 'Reservation deleted'
    });

  } catch (err) {

    return res.status(500).json({
      message: 'Error deleting reservation',
      error: err.message
    });

  }
};
