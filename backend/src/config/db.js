const { Sequelize } = require("sequelize");
const { logger } = require("../utils/logger");
require("dotenv").config();

// Confirm which DB the app connected to — useful when debugging env-file
// mixups across dev/staging — but only at debug level, and never in prod
// stdout where it could end up in shared CI/host logs.
if (process.env.NODE_ENV !== "production") {
    logger.debug(`Connecting to database: ${process.env.DB_NAME}`);
}

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: "mysql",
        logging: false
    }
);

module.exports = sequelize;
