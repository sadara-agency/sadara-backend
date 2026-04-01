import { sequelize } from "@config/database";

/**
 * Migration 070: Create sessions table
 *
 * Sessions represent the actual execution work linked to referrals.
 * Each session must be linked to a player and a referral.
 * Uses VARCHAR(50) for enum-like fields (validated by Zod at API boundary).
 */

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id         UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      referral_id       UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
      session_type      VARCHAR(50) NOT NULL,
      program_owner     VARCHAR(50) NOT NULL,
      responsible_id    UUID REFERENCES users(id) ON DELETE SET NULL,
      session_date      DATE NOT NULL,
      notes             TEXT,
      notes_ar          TEXT,
      completion_status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
      created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_referral ON sessions(referral_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_responsible ON sessions(responsible_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(completion_status);
    CREATE INDEX IF NOT EXISTS idx_sessions_program_owner ON sessions(program_owner);
    CREATE INDEX IF NOT EXISTS idx_sessions_player_date ON sessions(player_id, session_date);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS sessions`);
}
