// ═══════════════════════════════════════════════════════════════
// Migration 040: Create wellness foundation tables
//
// Tables: wellness_profiles, wellness_weight_logs
// Supports BMR/macro engine and weight tracking features.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  const tx = await sequelize.transaction();
  try {
    // ── wellness_profiles ──
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS wellness_profiles (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id     UUID NOT NULL UNIQUE
                        REFERENCES players(id) ON DELETE CASCADE,
        sex           VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female')),
        activity_level DECIMAL(3,2) NOT NULL DEFAULT 1.55
                        CHECK (activity_level >= 1.0 AND activity_level <= 2.5),
        goal          VARCHAR(20) NOT NULL DEFAULT 'maintenance'
                        CHECK (goal IN ('bulk', 'cut', 'maintenance')),
        target_calories  INTEGER,
        target_protein_g DECIMAL(6,1),
        target_fat_g     DECIMAL(6,1),
        target_carbs_g   DECIMAL(6,1),
        notes         TEXT,
        created_by    UUID NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
      { transaction: tx },
    );

    // ── wellness_weight_logs ──
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS wellness_weight_logs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id   UUID NOT NULL
                      REFERENCES players(id) ON DELETE CASCADE,
        weight_kg   DECIMAL(5,1) NOT NULL CHECK (weight_kg > 0),
        body_fat_pct DECIMAL(4,1) CHECK (body_fat_pct >= 0 AND body_fat_pct <= 100),
        notes       TEXT,
        logged_at   DATE NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (player_id, logged_at)
      );`,
      { transaction: tx },
    );

    // ── Indexes ──
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_wellness_weight_logs_player_date
       ON wellness_weight_logs (player_id, logged_at DESC);`,
      { transaction: tx },
    );

    // ── Seed wellness module permissions for all roles ──
    await sequelize.query(
      `INSERT INTO role_permissions (role, module, can_create, can_read, can_update, can_delete)
       VALUES
         ('Admin',     'wellness', true,  true,  true,  true),
         ('Manager',   'wellness', true,  true,  true,  true),
         ('GymCoach',  'wellness', true,  true,  true,  false),
         ('Coach',     'wellness', false, true,  false, false),
         ('Analyst',   'wellness', false, true,  false, false),
         ('Player',    'wellness', true,  true,  true,  false),
         ('Scout',     'wellness', false, false, false, false),
         ('Legal',     'wellness', false, false, false, false),
         ('Finance',   'wellness', false, false, false, false),
         ('Media',     'wellness', false, false, false, false),
         ('Executive', 'wellness', false, true,  false, false)
       ON CONFLICT (role, module) DO NOTHING;`,
      { transaction: tx },
    );

    await tx.commit();
    console.log("Migration 040: Wellness foundation tables created");
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function down() {
  const tx = await sequelize.transaction();
  try {
    await sequelize.query(
      `DROP TABLE IF EXISTS wellness_weight_logs;
       DROP TABLE IF EXISTS wellness_profiles;
       DELETE FROM role_permissions WHERE module = 'wellness';`,
      { transaction: tx },
    );
    await tx.commit();
    console.log("Migration 040: Wellness foundation tables dropped");
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
