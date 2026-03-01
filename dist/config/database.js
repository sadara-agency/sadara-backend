"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
exports.testConnection = testConnection;
exports.transaction = transaction;
const sequelize_1 = require("sequelize");
const env_1 = require("./env");
const logger_1 = require("./logger");
const sequelizeOptions = {
    host: env_1.env.db.host,
    port: env_1.env.db.port,
    database: env_1.env.db.name,
    username: env_1.env.db.user,
    password: env_1.env.db.password,
    dialect: 'postgres',
    // Use structured logger instead of console.log
    logging: env_1.env.nodeEnv === 'production'
        ? false // Disable query logging in production for performance
        : (msg) => logger_1.logger.debug(msg),
    pool: {
        max: env_1.env.nodeEnv === 'production' ? 20 : 5,
        min: env_1.env.nodeEnv === 'production' ? 2 : 0,
        acquire: 30000,
        idle: 10000,
    },
    dialectOptions: {
        useUTC: true,
        ...(env_1.env.nodeEnv === 'production' && {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        }),
    },
    // Retry logic for transient connection failures
    retry: {
        max: 3,
    },
};
exports.sequelize = new sequelize_1.Sequelize(sequelizeOptions);
async function testConnection() {
    try {
        await exports.sequelize.authenticate();
        logger_1.logger.info('Database connection established', {
            host: env_1.env.db.host,
            database: env_1.env.db.name,
            pool: sequelizeOptions.pool?.max,
        });
    }
    catch (err) {
        logger_1.logger.error('Database connection failed', { error: err.message });
        throw err;
    }
}
async function transaction(callback) {
    return exports.sequelize.transaction(callback);
}
//# sourceMappingURL=database.js.map