import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    ALTER TABLE players
    ADD COLUMN IF NOT EXISTS player_package VARCHAR(10) DEFAULT 'C' NOT NULL;
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_players_package ON players (player_package);
  `);
}

export async function down() {
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_players_package;
  `);
  await sequelize.query(`
    ALTER TABLE players
    DROP COLUMN IF EXISTS player_package;
  `);
}
