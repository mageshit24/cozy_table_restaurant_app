const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Menu = sequelize.define('Menu', {
  name:        { type: DataTypes.STRING,  allowNull: false },
  price:       { type: DataTypes.FLOAT,   allowNull: false },
  category:    { type: DataTypes.STRING },
  description: { type: DataTypes.STRING },
  image:       { type: DataTypes.STRING }   // stores filename e.g. "abc123.jpg"
});

module.exports = Menu;
