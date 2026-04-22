// ═══════════════════════════════════════════════════════════════
// Migration 134: Create body_compositions table
//
// One row = one InBody scan for a player on a specific date.
// Core body comp + segmental lean/fat + metabolic + optional PDF.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS body_compositions (
      id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id                 UUID NOT NULL,
      scan_date                 DATE NOT NULL,
      scan_device               VARCHAR(50),

      -- Core body composition
      weight_kg                 DECIMAL(5,1) NOT NULL,
      body_fat_pct              DECIMAL(4,1) CHECK (body_fat_pct >= 0 AND body_fat_pct <= 100),
      body_fat_mass_kg          DECIMAL(5,1),
      lean_body_mass_kg         DECIMAL(5,1),
      skeletal_muscle_mass_kg   DECIMAL(5,1),
      total_body_water_kg       DECIMAL(5,1),
      protein_kg                DECIMAL(4,1),
      minerals_kg               DECIMAL(4,1),

      -- Segmental lean mass (kg)
      segmental_lean_right_arm  DECIMAL(4,1),
      segmental_lean_left_arm   DECIMAL(4,1),
      segmental_lean_trunk      DECIMAL(5,1),
      segmental_lean_right_leg  DECIMAL(5,1),
      segmental_lean_left_leg   DECIMAL(5,1),

      -- Segmental fat mass (kg)
      segmental_fat_right_arm   DECIMAL(4,1),
      segmental_fat_left_arm    DECIMAL(4,1),
      segmental_fat_trunk       DECIMAL(5,1),
      segmental_fat_right_leg   DECIMAL(5,1),
      segmental_fat_left_leg    DECIMAL(5,1),

      -- Metabolic / visceral
      measured_bmr              INTEGER,
      visceral_fat_level        INTEGER CHECK (visceral_fat_level >= 1 AND visceral_fat_level <= 30),
      visceral_fat_area_cm2     DECIMAL(6,1),
      waist_hip_ratio           DECIMAL(4,2),
      metabolic_age             INTEGER,

      -- Document attachment (optional InBody PDF)
      pdf_document_id           UUID,

      notes                     TEXT,
      recorded_by               UUID NOT NULL,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

      UNIQUE (player_id, scan_date)
    );
  `);

  // ── FK constraints (idempotent) ──
  try {
    await sequelize.query(`
      ALTER TABLE body_compositions
        ADD CONSTRAINT fk_body_compositions_player
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    `);
  } catch {
    // Constraint already exists — fine
  }

  try {
    await sequelize.query(`
      ALTER TABLE body_compositions
        ADD CONSTRAINT fk_body_compositions_document
        FOREIGN KEY (pdf_document_id) REFERENCES documents(id) ON DELETE SET NULL;
    `);
  } catch {
    // Constraint already exists — fine
  }

  try {
    await sequelize.query(`
      ALTER TABLE body_compositions
        ADD CONSTRAINT fk_body_compositions_recorded_by
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT;
    `);
  } catch {
    // Constraint already exists — fine
  }

  // ── Indexes ──
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_body_compositions_player_date
    ON body_compositions (player_id, scan_date DESC);
  `);

  console.log("Migration 134: body_compositions table created");
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS body_compositions`);
  console.log("Migration 134: body_compositions table dropped");
}
