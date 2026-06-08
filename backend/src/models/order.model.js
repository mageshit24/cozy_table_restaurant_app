const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Order = sequelize.define("Order", {
    totalAmount: DataTypes.FLOAT,
    status: { type: DataTypes.STRING, defaultValue: "pending" }    
});

module.exports = Order;
