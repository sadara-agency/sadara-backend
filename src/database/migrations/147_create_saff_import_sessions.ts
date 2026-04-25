// ═══════════════════════════════════════════════════════════════
// Migration 147: SAFF Import Sessions
//
// Creates the saff_import_sessions table that powers the wizard-based
// SAFF data ingestion flow (select → fetch → map → review → apply).
// One in-flight session per (tournament, season) is enforced by a
// partial unique index. Sessions expire after 24h; a reaper deletes
// stale rows that never reached "done" or "aborted".
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  // Guard: parent tables must exist (fresh-DB safety)
  const [tournamentsExist] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'saff_tournaments' AND table_schema = 'public'`,
  );
  const [usersExist] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'`,
  );
  if (
    (tournamentsExist as unknown[]).length === 0 ||
    (usersExist as unknown[]).length === 0
  ) {
    return;
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saff_import_sessions (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tournament_id      UUID NOT NULL REFERENCES saff_tournaments(id) ON DELETE CASCADE,
      saff_id            INTEGER NOT NULL,
      season             VARCHAR(20) NOT NULL,
      step               VARCHAR(16) NOT NULL DEFAULT 'select',
      fetch_job_id       VARCHAR(128),
      upload_filename    VARCHAR(255),
      snapshot           JSONB NOT NULL DEFAULT '{}'::jsonb,
      decisions          JSONB NOT NULL DEFAULT '{}'::jsonb,
      preview            JSONB,
      preview_digest     VARCHAR(64),
      applied_at         TIMESTAMPTZ,
      applied_summary    JSONB,
      created_by         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at         TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT saff_import_sessions_step_check
        CHECK (step IN ('select','fetch','map','review','apply','done','aborted'))
    );
  `);

  // Partial unique index — only one active session per (tournament, season)
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saff_import_sessions_active
    ON saff_import_sessions (tournament_id, season)
    WHERE step NOT IN ('done', 'aborted');
  `);

  // Lookup by user + step for "Resume import" banner
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saff_import_sessions_user_step
    ON saff_import_sessions (created_by, step);
  `);

  // Reaper scans for expired in-flight sessions
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saff_import_sessions_expires_at
    ON saff_import_sessions (expires_at)
    WHERE step NOT IN ('done', 'aborted');
  `);

  console.log(
    "Migration 147: saff_import_sessions table created with partial unique + reaper indexes",
  );
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS saff_import_sessions`);
  console.log("Migration 147: saff_import_sessions table dropped");
}
