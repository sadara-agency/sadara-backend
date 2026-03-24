// ═══════════════════════════════════════════════════════════════
// Migration 040: Create wellness foundation tables
//
// Tables: wellness_profiles, wellness_weight_logs
// Supports BMR/macro engine and weight tracking features.
//
// NOTE: Tables may already exist from Sequelize model.sync().
// All statements are fully idempotent — no FK inline constraints
// (added separately), no ON CONFLICT (uses WHERE NOT EXISTS).
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  // ── wellness_profiles ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS wellness_profiles (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id     UUID NOT NULL UNIQUE,
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
    );
  `);

  // ── wellness_weight_logs ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS wellness_weight_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id   UUID NOT NULL,
      weight_kg   DECIMAL(5,1) NOT NULL CHECK (weight_kg > 0),
      body_fat_pct DECIMAL(4,1) CHECK (body_fat_pct >= 0 AND body_fat_pct <= 100),
      notes       TEXT,
      logged_at   DATE NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (player_id, logged_at)
    );
  `);

  // ── FK constraints (idempotent) ──
  try {
    await sequelize.query(`
      ALTER TABLE wellness_profiles
        ADD CONSTRAINT fk_wellness_profiles_player
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    `);
  } catch {
    // Constraint already exists — fine
  }

  try {
    await sequelize.query(`
      ALTER TABLE wellness_weight_logs
        ADD CONSTRAINT fk_wellness_weight_logs_player
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    `);
  } catch {
    // Constraint already exists — fine
  }

  // ── Indexes ──
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_wellness_weight_logs_player_date
    ON wellness_weight_logs (player_id, logged_at DESC);
  `);

  // ── Seed wellness module permissions (no ON CONFLICT needed) ──
  const roles = [
    ["Admin", true, true, true, true],
    ["Manager", true, true, true, true],
    ["GymCoach", true, true, true, false],
    ["Coach", false, true, false, false],
    ["Analyst", false, true, false, false],
    ["Player", true, true, true, false],
    ["Scout", false, false, false, false],
    ["Legal", false, false, false, false],
    ["Finance", false, false, false, false],
    ["Media", false, false, false, false],
    ["Executive", false, true, false, false],
  ] as const;

  for (const [role, c, r, u, d] of roles) {
    await sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       SELECT gen_random_uuid(), :role, 'wellness', :c, :r, :u, :d, NOW(), NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM role_permissions WHERE role = :role AND module = 'wellness'
       )`,
      { replacements: { role, c, r, u, d } },
    );
  }

  console.log("Migration 040: Wellness foundation tables created");
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS wellness_weight_logs`);
  await sequelize.query(`DROP TABLE IF EXISTS wellness_profiles`);
  await sequelize.query(
    `DELETE FROM role_permissions WHERE module = 'wellness'`,
  );
  console.log("Migration 040: Wellness foundation tables dropped");
}
