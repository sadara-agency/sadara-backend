import { sequelize } from "@config/database";

/**
 * Migration 098: Add Evolution Cycles framework
 *
 * Creates `evolution_cycles` table to group journey stages into structured
 * career progression cycles (Diagnostic → Foundation → Integration → Mastery).
 *
 * Adds `phase`, `evolution_cycle_id`, `blocker_description`, and `target_kpi`
 * columns to `player_journeys` for per-stage phase tracking.
 */
export async function up() {
  // 1. Create evolution_cycles table
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS evolution_cycles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      blocker_summary TEXT,
      blocker_summary_ar TEXT,
      tier VARCHAR(50) NOT NULL DEFAULT 'StrugglingTalent',
      current_phase VARCHAR(50) NOT NULL DEFAULT 'Diagnostic',
      status VARCHAR(50) NOT NULL DEFAULT 'Active',
      start_date DATE,
      expected_end_date DATE,
      actual_end_date DATE,
      target_kpis JSONB,
      notes TEXT,
      notes_ar TEXT,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_evolution_cycles_player_id
      ON evolution_cycles(player_id);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_evolution_cycles_status
      ON evolution_cycles(status);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_evolution_cycles_player_status
      ON evolution_cycles(player_id, status);
  `);

  // 2. Add phase + cycle fields to player_journeys
  await sequelize.query(`
    ALTER TABLE player_journeys
    ADD COLUMN IF NOT EXISTS phase VARCHAR(50),
    ADD COLUMN IF NOT EXISTS evolution_cycle_id UUID REFERENCES evolution_cycles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS blocker_description TEXT,
    ADD COLUMN IF NOT EXISTS target_kpi VARCHAR(500);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_player_journeys_evolution_cycle_id
      ON player_journeys(evolution_cycle_id);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_player_journeys_phase
      ON player_journeys(phase);
  `);
}

export async function down() {
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_player_journeys_phase;
  `);
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_player_journeys_evolution_cycle_id;
  `);
  await sequelize.query(`
    ALTER TABLE player_journeys
    DROP COLUMN IF EXISTS target_kpi,
    DROP COLUMN IF EXISTS blocker_description,
    DROP COLUMN IF EXISTS evolution_cycle_id,
    DROP COLUMN IF EXISTS phase;
  `);
  await sequelize.query(`
    DROP TABLE IF EXISTS evolution_cycles;
  `);
}
