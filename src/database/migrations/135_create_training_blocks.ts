// ═══════════════════════════════════════════════════════════════
// Migration 135: Create training_blocks table
//
// One row = one periodization block for a player (4–16 weeks).
// Soft-linked to start/end InBody scans from body_compositions.
// Partial unique index enforces at most one 'active' block per player.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS training_blocks (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id       UUID NOT NULL,
      status          VARCHAR(20) NOT NULL DEFAULT 'active',
      goal            VARCHAR(30) NOT NULL,
      duration_weeks  INTEGER NOT NULL,
      started_at      DATE NOT NULL,
      planned_end_at  DATE NOT NULL,
      closed_at       DATE,
      paused_at       DATE,
      start_scan_id   UUID,
      end_scan_id     UUID,
      target_outcomes JSONB,
      notes           TEXT,
      closed_by       UUID,
      created_by      UUID NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT training_blocks_status_check
        CHECK (status IN ('active', 'paused', 'closed')),
      CONSTRAINT training_blocks_goal_check
        CHECK (goal IN ('bulk', 'cut', 'maintenance', 'recomp', 'rehab')),
      CONSTRAINT training_blocks_duration_check
        CHECK (duration_weeks >= 1 AND duration_weeks <= 16)
    );
  `);

  // ── Partial unique index: at most one active block per player ──
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_training_blocks_active_per_player
    ON training_blocks (player_id)
    WHERE status = 'active';
  `);

  // ── Regular indexes ──
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_training_blocks_player_status
    ON training_blocks (player_id, status);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_training_blocks_player_started
    ON training_blocks (player_id, started_at DESC);
  `);

  // ── FK constraints (idempotent) ──
  try {
    await sequelize.query(`
      ALTER TABLE training_blocks
        ADD CONSTRAINT fk_training_blocks_player
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    `);
  } catch {
    // Constraint already exists
  }

  try {
    await sequelize.query(`
      ALTER TABLE training_blocks
        ADD CONSTRAINT fk_training_blocks_start_scan
        FOREIGN KEY (start_scan_id) REFERENCES body_compositions(id) ON DELETE SET NULL;
    `);
  } catch {
    // Constraint already exists
  }

  try {
    await sequelize.query(`
      ALTER TABLE training_blocks
        ADD CONSTRAINT fk_training_blocks_end_scan
        FOREIGN KEY (end_scan_id) REFERENCES body_compositions(id) ON DELETE SET NULL;
    `);
  } catch {
    // Constraint already exists
  }

  try {
    await sequelize.query(`
      ALTER TABLE training_blocks
        ADD CONSTRAINT fk_training_blocks_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
    `);
  } catch {
    // Constraint already exists
  }

  try {
    await sequelize.query(`
      ALTER TABLE training_blocks
        ADD CONSTRAINT fk_training_blocks_closed_by
        FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL;
    `);
  } catch {
    // Constraint already exists
  }

  console.log("Migration 135: training_blocks table created");
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS training_blocks`);
  console.log("Migration 135: training_blocks table dropped");
}
