const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true },
    phone: DataTypes.STRING,
    password: DataTypes.STRING,
    role: { type: DataTypes.ENUM("admin", "customer"), defaultValue: "customer" }
});

module.exports = User;
