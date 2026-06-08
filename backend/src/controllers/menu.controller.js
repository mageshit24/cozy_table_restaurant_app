/**
 * menu.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes & improvements vs original:
 *
 *  BUG FIX – Slow page refresh / blank menu:
 *    buildImageUrl previously returned an ABSOLUTE URL
 *    (e.g. http://localhost:5000/uploads/abc.jpg).  The Angular dev-proxy only
 *    intercepts *relative* paths beginning with /uploads.  Absolute URLs skip
 *    the proxy and hit localhost:5000 directly from the browser – this caused
 *    a long pending request on page load and images never rendered.
 *    Now imageUrl is returned as a ROOT-RELATIVE path (/uploads/<filename>)
 *    so the Angular proxy correctly forwards it to the backend.
 *
 *  • Full structured Winston logging for every operation and error
 */

const { Menu } = require('../models');
const { Op }   = require('sequelize');
const path     = require('path');
const fs       = require('fs');
const { logActivity, logError } = require('../utils/logger');

/* Ensure uploads directory always exists */
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

/**
 * BUG FIX: Return a root-relative URL so Angular's devProxy intercepts it.
 * Production deployments (nginx/same-origin) also work with root-relative paths.
 * The old `${req.protocol}://${req.get('host')}/uploads/${filename}` produced
 * an absolute http://localhost:5000 URL that bypassed the Angular proxy.
 */
const buildImageUrl = (filename) =>
  filename ? `/uploads/${filename}` : null;

/* ─────────────────── GET MENU ──────────────────────────────────────────── */

exports.getMenu = async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = {};
    if (category) where.category = category;
    if (search)   where.name = { [Op.like]: `%${search}%` };

    const items = await Menu.findAll({ where, order: [['createdAt', 'DESC']] });

    const result = items.map(item => ({
      ...item.toJSON(),
      imageUrl: buildImageUrl(item.image)
    }));

    logActivity(req, 'MENU_FETCH', { count: result.length, filters: { category, search } });
    return res.json(result);
  } catch (err) {
    logError(req, 'MENU_FETCH_ERROR', err);
    return res.status(500).json({ message: 'Error fetching menu', error: err.message });
  }
};

/* ─────────────────── CREATE MENU ──────────────────────────────────────── */

exports.createMenu = async (req, res) => {
  try {
    const { name, price, category, description } = req.body;
    if (!name || !price)
      return res.status(400).json({ message: 'Name and price are required' });

    const image = req.file ? req.file.filename : null;
    const item  = await Menu.create({
      name,
      price:       parseFloat(price),
      category:    category    || null,
      description: description || null,
      image
    });

    logActivity(req, 'MENU_CREATE', { itemId: item.id, name, category });
    return res.status(201).json({
      ...item.toJSON(),
      imageUrl: buildImageUrl(image)
    });
  } catch (err) {
    logError(req, 'MENU_CREATE_ERROR', err, { name: req.body?.name });
    return res.status(500).json({ message: 'Error creating menu item', error: err.message });
  }
};

/* ─────────────────── UPDATE MENU ──────────────────────────────────────── */

exports.updateMenu = async (req, res) => {
  try {
    const item = await Menu.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });

    const image = req.file ? req.file.filename : item.image;

    await item.update({
      name:        req.body.name        ?? item.name,
      price:       req.body.price       ? parseFloat(req.body.price) : item.price,
      category:    req.body.category    ?? item.category,
      description: req.body.description ?? item.description,
      image
    });

    logActivity(req, 'MENU_UPDATE', { itemId: item.id, name: item.name });
    return res.json({
      message: 'Menu updated',
      item: { ...item.toJSON(), imageUrl: buildImageUrl(image) }
    });
  } catch (err) {
    logError(req, 'MENU_UPDATE_ERROR', err, { itemId: req.params.id });
    return res.status(500).json({ message: 'Error updating menu item', error: err.message });
  }
};

/* ─────────────────── DELETE MENU ──────────────────────────────────────── */

exports.deleteMenu = async (req, res) => {
  try {
    const item = await Menu.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });

    const { name } = item;
    await item.destroy();

    logActivity(req, 'MENU_DELETE', { itemId: req.params.id, name });
    return res.json({ message: 'Menu item deleted' });
  } catch (err) {
    logError(req, 'MENU_DELETE_ERROR', err, { itemId: req.params.id });
    return res.status(500).json({ message: 'Error deleting menu item', error: err.message });
  }
};
