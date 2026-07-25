/**
 * menu.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Images now live in the database, not on disk (see menu.model.js for the
 * `image` BLOB / `imageMimeType` / virtual `imageUrl` setup). The old
 * `buildImageUrl(filename)` helper and the uploads-directory bootstrap are
 * gone — `imageUrl` is computed by the model itself on every read, so every
 * response below just needs `item.toJSON()` (or `.get()` for the raw
 * instance before `.create`/`.update` returns a full model instance).
 *
 * Full structured Winston logging kept for every operation and error.
 */

const { Menu } = require('../models');
const { Op } = require('sequelize');
const { logActivity, logError, safeError } = require('../utils/logger');

/* ─────────────────── GET MENU ──────────────────────────────────────────── */

exports.getMenu = async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = {};
    if (category) where.category = category;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const items = await Menu.findAll({ where, order: [['createdAt', 'DESC']] });

    logActivity(req, 'MENU_FETCH', { count: items.length, filters: { category, search } });
    return res.json(items); // toJSON() on each instance already strips the raw BLOB
  } catch (err) {
    logError(req, 'MENU_FETCH_ERROR', err);
    return res.status(500).json({ message: 'Error fetching menu', error: safeError(err) });
  }
};

/* ─────────────────── CREATE MENU ──────────────────────────────────────── */

exports.createMenu = async (req, res) => {
  try {
    const { name, price, category, description } = req.body;
    if (!name || !price)
      return res.status(400).json({ message: 'Name and price are required' });

    const item = await Menu.create({
      name,
      price: parseFloat(price),
      category: category || null,
      description: description || null,
      image: req.file ? req.file.buffer : null,
      imageMimeType: req.file ? req.file.mimetype : null,
    });

    logActivity(req, 'MENU_CREATE', { itemId: item.id, name, category });
    return res.status(201).json(item);
  } catch (err) {
    logError(req, 'MENU_CREATE_ERROR', err, { name: req.body?.name });
    return res.status(500).json({ message: 'Error creating menu item', error: safeError(err) });
  }
};

/* ─────────────────── UPDATE MENU ──────────────────────────────────────── */

exports.updateMenu = async (req, res) => {
  try {
    const item = await Menu.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });

    // Only touch the image columns when a new file was actually uploaded —
    // otherwise keep whatever's already stored (mirrors the old "keep
    // existing filename if no new file" behavior).
    const imageFields = req.file
      ? { image: req.file.buffer, imageMimeType: req.file.mimetype }
      : {};

    await item.update({
      name: req.body.name ?? item.name,
      price: req.body.price ? parseFloat(req.body.price) : item.price,
      category: req.body.category ?? item.category,
      description: req.body.description ?? item.description,
      ...imageFields
    });

    logActivity(req, 'MENU_UPDATE', { itemId: item.id, name: item.name });
    return res.json({ message: 'Menu updated', item });
  } catch (err) {
    logError(req, 'MENU_UPDATE_ERROR', err, { itemId: req.params.id });
    return res.status(500).json({ message: 'Error updating menu item', error: safeError(err) });
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
    return res.status(500).json({ message: 'Error deleting menu item', error: safeError(err) });
  }
};
