/**
 * auth.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes & improvements vs original:
 *  • All handlers wrapped in try/catch (profile, updateProfile, changePassword
 *    were bare – any DB error would crash the request)
 *  • Structured Winston logging for every login, logout, register, and error
 *    via logActivity / logError helpers
 *  • Sensitive fields (password hash) never logged
 *  • Input validation guards on register and changePassword
 */

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { User, TokenBlacklist } = require('../models');
const { blacklistToken } = require('../middleware/auth.middleware');
const { logActivity, logError }  = require('../utils/logger');

/* ─────────────────── REGISTER ─────────────────────────────────────────── */

exports.register = async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      logActivity(req, 'REGISTER_DUPLICATE', { email });
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ name, email, phone, password: hashed });

    logActivity(req, 'REGISTER_SUCCESS', { userId: user.id, email });
    return res.json({ message: 'Registered successfully' });
  } catch (err) {
    logError(req, 'REGISTER_ERROR', err, { email });
    return res.status(500).json({ message: 'Registration failed' });
  }
};

/* ─────────────────── LOGIN ─────────────────────────────────────────────── */

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      logActivity(req, 'LOGIN_FAILED_USER_NOT_FOUND', { email });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logActivity(req, 'LOGIN_FAILED_BAD_PASSWORD', { email, userId: user.id });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    logActivity(req, 'LOGIN_SUCCESS', { userId: user.id, email, role: user.role });

    return res.json({
      token,
      user: { id: user.id, role: user.role, name: user.name, email: user.email }
    });
  } catch (err) {
    logError(req, 'LOGIN_ERROR', err, { email });
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

/* ─────────────────── PROFILE ───────────────────────────────────────────── */

exports.profile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    logActivity(req, 'PROFILE_VIEW', {});
    return res.json(user);
  } catch (err) {
    logError(req, 'PROFILE_VIEW_ERROR', err);
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

/* ─────────────────── UPDATE PROFILE ───────────────────────────────────── */

exports.updateProfile = async (req, res) => {
  try {
    // Prevent privilege escalation via profile update
    const { password, role, ...safeFields } = req.body;

    await User.update(safeFields, { where: { id: req.user.id } });

    logActivity(req, 'PROFILE_UPDATE', { fields: Object.keys(safeFields) });
    return res.json({ message: 'Profile updated' });
  } catch (err) {
    logError(req, 'PROFILE_UPDATE_ERROR', err);
    return res.status(500).json({ message: 'Failed to update profile' });
  }
};

/* ─────────────────── CHANGE PASSWORD ──────────────────────────────────── */

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old and new passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user  = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      logActivity(req, 'PASSWORD_CHANGE_BAD_OLD_PW', {});
      return res.status(400).json({ message: 'Old password incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.update({ password: hashed }, { where: { id: req.user.id } });

    logActivity(req, 'PASSWORD_CHANGE_SUCCESS', {});
    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logError(req, 'PASSWORD_CHANGE_ERROR', err);
    return res.status(500).json({ message: 'Failed to change password' });
  }
};

/* ─────────────────── LOGOUT ────────────────────────────────────────────── */

exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    // Updates both DB and in-memory cache atomically
    await blacklistToken(token);

    logActivity(req, 'LOGOUT_SUCCESS', {});
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    logError(req, 'LOGOUT_ERROR', err);
    return res.status(500).json({ message: 'Logout failed' });
  }
};
