const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TokenBlacklist = sequelize.define("TokenBlacklist", {
    token: DataTypes.TEXT
});

module.exports = TokenBlacklist;
