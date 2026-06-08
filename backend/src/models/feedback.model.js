const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Feedback = sequelize.define("Feedback", {
    rating: DataTypes.INTEGER,
    comment: DataTypes.TEXT
});

module.exports = Feedback;
