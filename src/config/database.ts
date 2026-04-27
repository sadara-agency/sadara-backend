import { Sequelize, Options } from "sequelize";
import { env } from "@config/env";
import { logger } from "@config/logger";

// Cloud SQL via Unix socket: DB_HOST starts with /cloudsql/
const isCloudSQL = env.db.host.startsWith("/cloudsql/");

const sequelizeOptions: Options = {
  database: env.db.name,
  username: env.db.user,
  password: env.db.password,
  dialect: "postgres",

  // Cloud SQL uses Unix socket; others use host:port
  ...(isCloudSQL
    ? { host: env.db.host }
    : { host: env.db.host, port: env.db.port }),

  // Production: log slow queries (>1s) for observability
  // Development: log all queries at debug level
  logging:
    env.nodeEnv === "production"
      ? (sql: string, timing?: number) => {
          if (timing && timing > 1000) {
            logger.warn("Slow query detected", {
              sql: sql.slice(0, 500),
              durationMs: timing,
            });
          }
        }
      : (msg) => logger.debug(msg as string),
  benchmark: env.nodeEnv === "production",

  pool: {
    max: env.nodeEnv === "production" ? 10 : 5,
    min: env.nodeEnv === "production" ? 1 : 0,
    acquire: 10000,
    idle: 5000,
  },

  dialectOptions: {
    useUTC: true,
    // Fail fast if the DB socket isn't reachable (prevents server.timeout from
    // firing a raw "Service Unavailable" before the health endpoint can respond)
    connectTimeout: 5000,
    // Cloud SQL Auth Proxy handles encryption — no SSL needed
    // External hosts (Supabase, etc.) in production need SSL
    ...(env.nodeEnv === "production" &&
      !isCloudSQL && {
        ssl: {
          require: true,
          rejectUnauthorized: env.db.sslRejectUnauthorized,
        },
      }),
  },

  // Retry logic for transient connection failures
  retry: {
    max: 3,
  },
};

export const sequelize = new Sequelize(sequelizeOptions);

export async function testConnection(
  retries = 10,
  delayMs = 5000,
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info("Database connected", {
        database: env.db.name,
        ...(attempt > 1 && { attempt }),
      });
      return;
    } catch (err) {
      logger.error(
        `Database connection failed (attempt ${attempt}/${retries})`,
        {
          error: (err as Error).message,
          host: env.db.host,
        },
      );
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function transaction<T>(
  callback: (t: import("sequelize").Transaction) => Promise<T>,
): Promise<T> {
  return sequelize.transaction(callback);
}
