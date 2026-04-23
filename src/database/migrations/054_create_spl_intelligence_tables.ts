// ═══════════════════════════════════════════════════════════════
// Migration 054: SPL Intelligence Engine Tables
//
// Creates 3 tables for the intelligence engine:
// 1. spl_competitions — Multi-league registry
// 2. spl_insights — Auto-discovered scouting intelligence
// 3. spl_tracked_players — Manual player monitoring
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'watchlists' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  // ── 1. spl_competitions ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS spl_competitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pulselive_comp_id INTEGER NOT NULL UNIQUE,
      pulselive_season_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      tier VARCHAR(50) DEFAULT 'premier',
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed Roshn Saudi League
  await sequelize.query(`
    INSERT INTO spl_competitions (id, pulselive_comp_id, pulselive_season_id, name, name_ar, tier, created_at, updated_at)
    VALUES (gen_random_uuid(), 72, 859, 'Roshn Saudi League', 'دوري روشن السعودي', 'premier', NOW(), NOW())
    ON CONFLICT (pulselive_comp_id) DO NOTHING;
  `);

  // ── 2. spl_insights ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS spl_insights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      competition_id UUID REFERENCES spl_competitions(id) ON DELETE CASCADE,
      insight_type VARCHAR(50) NOT NULL,
      pulselive_player_id INTEGER NOT NULL,
      player_name VARCHAR(255) NOT NULL,
      team_name VARCHAR(255),
      position VARCHAR(50),
      nationality VARCHAR(100),
      age INTEGER,
      headline VARCHAR(500) NOT NULL,
      headline_ar VARCHAR(500),
      details JSONB NOT NULL DEFAULT '{}',
      score DECIMAL(5,2) DEFAULT 0,
      watchlist_id UUID REFERENCES watchlists(id) ON DELETE SET NULL,
      is_dismissed BOOLEAN NOT NULL DEFAULT false,
      detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_spl_insights_type_dismissed
    ON spl_insights (insight_type, is_dismissed, detected_at DESC);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_spl_insights_player
    ON spl_insights (pulselive_player_id);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_spl_insights_watchlist
    ON spl_insights (watchlist_id) WHERE watchlist_id IS NOT NULL;
  `);

  // ── 3. spl_tracked_players ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS spl_tracked_players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      competition_id UUID REFERENCES spl_competitions(id) ON DELETE SET NULL,
      pulselive_player_id INTEGER NOT NULL,
      player_name VARCHAR(255) NOT NULL,
      team_name VARCHAR(255),
      position VARCHAR(50),
      nationality VARCHAR(100),
      last_stats_snapshot JSONB,
      previous_stats_snapshot JSONB,
      alert_config JSONB NOT NULL DEFAULT '{}',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, pulselive_player_id)
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_spl_tracked_user
    ON spl_tracked_players (user_id);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS spl_tracked_players CASCADE;`);
  await sequelize.query(`DROP TABLE IF EXISTS spl_insights CASCADE;`);
  await sequelize.query(`DROP TABLE IF EXISTS spl_competitions CASCADE;`);
}
