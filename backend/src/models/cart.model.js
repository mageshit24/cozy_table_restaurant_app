const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("Cart", {
    userId: DataTypes.INTEGER,
    menuId: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER
});
