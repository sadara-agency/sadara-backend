"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
exports.testConnection = testConnection;
exports.transaction = transaction;
const sequelize_1 = require("sequelize");
const env_1 = require("./env");
const chalk_1 = __importDefault(require("chalk"));
// // 1. Configure Sequelize Connection
// const sequelizeOptions: Options = {
//   host: env.db.host,
//   port: env.db.port,
//   database: env.db.name,
//   username: env.db.user,
//   password: env.db.password,
//   dialect: 'postgres',
//   logging: (msg) => console.log(`${chalk.gray('  [DB] ')} ${chalk.blue(msg)}`),
//   pool: {
//     max: 20,
//     min: 0,
//     acquire: 30000,
//     idle: 10000,
//   },
//   // Postgres specific: ensure dates are handled correctly
//   dialectOptions: {
//     useUTC: true,
//   },
// };
const sequelizeOptions = {
    host: env_1.env.db.host,
    port: env_1.env.db.port,
    database: env_1.env.db.name,
    username: env_1.env.db.user,
    password: env_1.env.db.password,
    dialect: 'postgres',
    logging: (msg) => console.log(`${chalk_1.default.gray('  [DB] ')} ${chalk_1.default.blue(msg)}`),
    pool: {
        max: 5,
        min: 0,
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
};
exports.sequelize = new sequelize_1.Sequelize(sequelizeOptions);
// 2. Test connection (Used in your bootstrap)
async function testConnection() {
    try {
        await exports.sequelize.authenticate();
        // Your index.ts will handle the "OPERATIONAL" success log
    }
    catch (err) {
        console.error(chalk_1.default.red('❌ Database connection failed:'), err);
        throw err;
    }
}
// 3. Transaction helper
// Sequelize has a built-in managed transaction system
async function transaction(callback) {
    return exports.sequelize.transaction(callback);
}
//# sourceMappingURL=database.js.map