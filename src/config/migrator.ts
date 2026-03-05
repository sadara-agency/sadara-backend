import { Umzug, SequelizeStorage } from "umzug";
import { sequelize } from "./database";
import path from "path";

export const migrator = new Umzug({
  migrations: {
    glob: ["database/migrations/*.{ts,js}", { cwd: path.resolve(__dirname, "..") }],
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize,
    tableName: "sequelize_meta",
  }),
  logger: console,
});

export type Migration = typeof migrator._types.migration;
