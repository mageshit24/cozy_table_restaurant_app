/**
 * reservation.model.js
 *
 * BUG FIX: Removed the explicit `userId` column definition.
 *
 * The `userId` foreign key is created automatically by the Sequelize association in
 * models/index.js (User.hasMany / Reservation.belongsTo with foreignKey: "userId").
 * Having it defined here AND in the association caused MySQL to throw:
 *   "Duplicate column name 'userId'"
 * during sync, crashing the server on fresh setups.
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Reservation = sequelize.define("Reservation", {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  time: {
    type: DataTypes.STRING,
    allowNull: false
  },

  guests: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  status: {
    type: DataTypes.STRING,
    defaultValue: "pending"
  }
  // userId omitted intentionally — created by the association in models/index.js
});

module.exports = Reservation;
