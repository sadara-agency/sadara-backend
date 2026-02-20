import { Sequelize, Options } from 'sequelize';
import { env } from './env';
import chalk from 'chalk';

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

const sequelizeOptions: Options = {
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  username: env.db.user,
  password: env.db.password,
  dialect: 'postgres',
  logging: (msg) => console.log(`${chalk.gray('  [DB] ')} ${chalk.blue(msg)}`),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    useUTC: true,
    ...(env.nodeEnv === 'production' && {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }),
  },
};

export const sequelize = new Sequelize(sequelizeOptions);

// 2. Test connection (Used in your bootstrap)
export async function testConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    // Your index.ts will handle the "OPERATIONAL" success log
  } catch (err) {
    console.error(chalk.red('❌ Database connection failed:'), err);
    throw err;
  }
}

// 3. Transaction helper
// Sequelize has a built-in managed transaction system
export async function transaction<T>(
  callback: (t: any) => Promise<T>
): Promise<T> {
  return sequelize.transaction(callback);
}