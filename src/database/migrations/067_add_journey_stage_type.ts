import { sequelize } from "@config/database";

/**
 * Migration 067: Add stage_type to player_journeys
 *
 * Classifies journey stages (e.g. PhysicalTraining, Assessment, Recovery).
 */

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_journeys' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    ALTER TABLE player_journeys
    ADD COLUMN IF NOT EXISTS stage_type VARCHAR(50) DEFAULT 'General';
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_player_journeys_stage_type
      ON player_journeys(stage_type);
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_journeys' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_player_journeys_stage_type;
  `);
  await sequelize.query(`
    ALTER TABLE player_journeys DROP COLUMN IF EXISTS stage_type;
  `);
}
