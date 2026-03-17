// ═══════════════════════════════════════════════════════════════
// Migration 034: Create external_provider_mappings table
//
// Stores mappings between internal players and external data
// providers (Wyscout, InStat, APIFootball, etc.) so player stats
// can be synced from third-party APIs.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS external_provider_mappings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      provider_name VARCHAR(50) NOT NULL,
      external_player_id VARCHAR(100) NOT NULL,
      external_team_id VARCHAR(100),
      api_base_url VARCHAR(500),
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_provider_player UNIQUE (player_id, provider_name)
    );

    CREATE INDEX IF NOT EXISTS idx_epm_player_id ON external_provider_mappings(player_id);
    CREATE INDEX IF NOT EXISTS idx_epm_provider ON external_provider_mappings(provider_name);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS external_provider_mappings;`);
}
