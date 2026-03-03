import { Sequelize, Options } from 'sequelize';
import { env } from './env';
import { logger } from './logger';

const sequelizeOptions: Options = {
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  username: env.db.user,
  password: env.db.password,
  dialect: 'postgres',

  // Use structured logger instead of console.log
  logging: env.nodeEnv === 'production'
    ? false // Disable query logging in production for performance
    : (msg) => logger.debug(msg as string),

  pool: {
    max: env.nodeEnv === 'production' ? 20 : 5,
    min: env.nodeEnv === 'production' ? 2 : 0,
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

  // Retry logic for transient connection failures
  retry: {
    max: 3,
  },
};

export const sequelize = new Sequelize(sequelizeOptions);

export async function testConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established', {
      host: env.db.host,
      database: env.db.name,
      pool: sequelizeOptions.pool?.max,
    });
  } catch (err) {
    logger.error('Database connection failed', { error: (err as Error).message });
    throw err;
  }
}

export async function transaction<T>(
  callback: (t: import('sequelize').Transaction) => Promise<T>,
): Promise<T> {
  return sequelize.transaction(callback);
}
