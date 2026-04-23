import { sequelize } from "@config/database";

/**
 * Migration 096: Add stage_owner column to player_journeys
 *
 * Each journey stage has a specialist role responsible for it.
 * This column was defined in the Sequelize model but never added to the DB.
 */

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_journeys' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    ALTER TABLE player_journeys
    ADD COLUMN IF NOT EXISTS stage_owner VARCHAR(50) NOT NULL DEFAULT 'Manager';
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_player_journeys_stage_owner
      ON player_journeys(stage_owner);
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_journeys' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_player_journeys_stage_owner;
  `);
  await sequelize.query(`
    ALTER TABLE player_journeys DROP COLUMN IF EXISTS stage_owner;
  `);
}
