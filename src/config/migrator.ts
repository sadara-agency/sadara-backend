import { Umzug, SequelizeStorage } from "umzug";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import path from "path";

/**
 * Set safety timeouts so a single migration can never hang the whole deploy.
 * - lock_timeout:      30 s — fail fast if another session holds a lock
 * - statement_timeout: 120 s — cap any single DDL/DML statement
 * Called once before migrator.up() runs.
 */
export async function setMigrationTimeouts(): Promise<void> {
  await sequelize.query("SET lock_timeout = '30s'");
  await sequelize.query("SET statement_timeout = '120s'");
  logger.info("Migration safety timeouts set (lock 30s, statement 120s)");
}

export const migrator = new Umzug({
  migrations: {
    glob: [
      "database/migrations/*.{ts,js}",
      { cwd: path.resolve(__dirname, "..") },
    ],
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize,
    tableName: "sequelize_meta",
  }),
  logger: {
    info: (msg) => {
      // Only log actual migration activity, not "up"/"down" bookkeeping
      if (typeof msg === "object" && (msg as any)?.event) {
        const { event, name, durationSeconds } = msg as any;
        if (event === "migrated") {
          logger.info(`Migration complete: ${name}`, { durationSeconds });
        } else if (event === "migrating") {
          logger.info(`Running migration: ${name}`);
        }
      }
    },
    warn: (msg) =>
      logger.warn(typeof msg === "string" ? msg : JSON.stringify(msg)),
    error: (msg) =>
      logger.error(
        typeof msg === "string"
          ? msg
          : ((msg as any)?.message ?? JSON.stringify(msg)),
      ),
    debug: () => {
      /* suppress debug noise */
    },
  },
});

export type Migration = typeof migrator._types.migration;
