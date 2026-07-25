/**
 * menu.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * IMAGE STORAGE: previously `image` held a filename (e.g. "abc123.jpg")
 * pointing at a file on disk in backend/uploads/. Switched to storing the
 * actual image bytes in the database:
 *   - `image`         → raw binary (BLOB), the file content itself
 *   - `imageMimeType`  → e.g. "image/jpeg", needed to serve it back correctly
 *   - `imageUrl`       → VIRTUAL, not a real column. Computed on read as a
 *     `data:<mime>;base64,<bytes>` URI so the frontend can drop it straight
 *     into an <img src>, exactly like it already did for the old
 *     `/uploads/...` URLs — no frontend changes needed.
 *
 * The VIRTUAL's second argument (`['image', 'imageMimeType']`) tells
 * Sequelize which real columns the getter depends on, so those columns are
 * fetched automatically whenever `imageUrl` is requested — including through
 * `attributes: [...]` restrictions on associations (see cart/order
 * controllers) — without ever exposing the raw BLOB in a JSON response
 * unless something explicitly asks for the `image` column itself.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Menu = sequelize.define('Menu', {
  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  category: { type: DataTypes.STRING },
  description: { type: DataTypes.STRING },

  image: { type: DataTypes.BLOB('long') }, // raw file bytes
  imageMimeType: { type: DataTypes.STRING },        // e.g. "image/jpeg"

  imageUrl: {
    type: DataTypes.VIRTUAL(DataTypes.STRING, ['image', 'imageMimeType']),
    get() {
      const bytes = this.getDataValue('image');
      const mime = this.getDataValue('imageMimeType');
      if (!bytes) return null;
      return `data:${mime || 'image/jpeg'};base64,${bytes.toString('base64')}`;
    }
  }
});

// Default JSON output never includes the raw BLOB — callers get `imageUrl`
// (already base64-encoded) instead. Any query that explicitly needs the
// raw bytes can still read `.image` directly on the Sequelize instance.
Menu.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.image;
  return values;
};

module.exports = Menu;
