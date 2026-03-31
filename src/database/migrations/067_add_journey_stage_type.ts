import { sequelize } from "@config/database";

/**
 * Migration 067: Add stage_type to player_journeys
 *
 * Classifies journey stages (e.g. PhysicalTraining, Assessment, Recovery).
 */

export async function up() {
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
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_player_journeys_stage_type;
  `);
  await sequelize.query(`
    ALTER TABLE player_journeys DROP COLUMN IF EXISTS stage_type;
  `);
}
