import { Umzug, SequelizeStorage } from "umzug";
import { sequelize } from "./database";
import { logger } from "./logger";
import path from "path";

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
    info: (msg) =>
      logger.info(typeof msg === "string" ? msg : JSON.stringify(msg)),
    warn: (msg) =>
      logger.warn(typeof msg === "string" ? msg : JSON.stringify(msg)),
    error: (msg) =>
      logger.error(
        typeof msg === "string"
          ? msg
          : ((msg as any)?.message ?? JSON.stringify(msg)),
      ),
    debug: (msg) =>
      logger.debug(typeof msg === "string" ? msg : JSON.stringify(msg)),
  },
});

export type Migration = typeof migrator._types.migration;
