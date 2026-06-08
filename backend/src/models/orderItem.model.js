const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OrderItem = sequelize.define("OrderItem", {
    quantity: { type: DataTypes.INTEGER },
    price: { type: DataTypes.FLOAT }
});

module.exports = OrderItem;
