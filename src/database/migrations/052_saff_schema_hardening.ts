// ═══════════════════════════════════════════════════════════════
// Migration 052: SAFF Schema Hardening
//
// Fixes data integrity issues in SAFF tables:
// 1. De-duplicates existing rows before adding constraints
// 2. Adds unique constraints to prevent duplicate standings/fixtures
// 3. Adds performance indexes for common queries
// 4. Adds proper ON DELETE behavior to foreign keys
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'saff_standings' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  // ── Step 1: De-duplicate existing data ──────────────────────

  // Remove duplicate standings (keep newest by updated_at)
  await sequelize.query(`
    DELETE FROM saff_standings
    WHERE id NOT IN (
      SELECT DISTINCT ON (tournament_id, season, saff_team_id) id
      FROM saff_standings
      ORDER BY tournament_id, season, saff_team_id, updated_at DESC
    );
  `);

  // Remove duplicate fixtures (keep newest by updated_at)
  await sequelize.query(`
    DELETE FROM saff_fixtures
    WHERE id NOT IN (
      SELECT DISTINCT ON (tournament_id, season, saff_home_team_id, saff_away_team_id, match_date) id
      FROM saff_fixtures
      ORDER BY tournament_id, season, saff_home_team_id, saff_away_team_id, match_date, updated_at DESC
    );
  `);

  // Remove duplicate match_id links (keep newest, null out rest)
  await sequelize.query(`
    UPDATE saff_fixtures SET match_id = NULL
    WHERE match_id IS NOT NULL
      AND id NOT IN (
        SELECT DISTINCT ON (match_id) id
        FROM saff_fixtures
        WHERE match_id IS NOT NULL
        ORDER BY match_id, updated_at DESC
      );
  `);

  // ── Step 2: Add unique constraints ──────────────────────────

  // Prevent same team appearing twice in a tournament+season
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saff_standings_team_season
      ON saff_standings (tournament_id, season, saff_team_id);
  `);

  // Prevent duplicate fixtures (same teams, same date, same tournament+season)
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saff_fixtures_match_identity
      ON saff_fixtures (tournament_id, season, saff_home_team_id, saff_away_team_id, match_date);
  `);

  // Prevent multiple fixtures linking to the same Match
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saff_fixtures_match_id_unique
      ON saff_fixtures (match_id) WHERE match_id IS NOT NULL;
  `);

  // ── Step 3: Add performance indexes ─────────────────────────

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saff_fixtures_home_club_id
      ON saff_fixtures (home_club_id);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saff_fixtures_away_club_id
      ON saff_fixtures (away_club_id);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saff_fixtures_status
      ON saff_fixtures (status);
  `);

  // ── Step 4: Fix ON DELETE behavior on foreign keys ──────────

  // saff_standings.tournament_id → CASCADE
  await sequelize.query(`
    ALTER TABLE saff_standings
      DROP CONSTRAINT IF EXISTS saff_standings_tournament_id_fkey,
      ADD CONSTRAINT saff_standings_tournament_id_fkey
        FOREIGN KEY (tournament_id) REFERENCES saff_tournaments(id) ON DELETE CASCADE;
  `);

  // saff_standings.club_id → SET NULL
  await sequelize.query(`
    ALTER TABLE saff_standings
      DROP CONSTRAINT IF EXISTS saff_standings_club_id_fkey,
      ADD CONSTRAINT saff_standings_club_id_fkey
        FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL;
  `);

  // saff_fixtures.tournament_id → CASCADE
  await sequelize.query(`
    ALTER TABLE saff_fixtures
      DROP CONSTRAINT IF EXISTS saff_fixtures_tournament_id_fkey,
      ADD CONSTRAINT saff_fixtures_tournament_id_fkey
        FOREIGN KEY (tournament_id) REFERENCES saff_tournaments(id) ON DELETE CASCADE;
  `);

  // saff_fixtures.home_club_id → SET NULL
  await sequelize.query(`
    ALTER TABLE saff_fixtures
      DROP CONSTRAINT IF EXISTS saff_fixtures_home_club_id_fkey,
      ADD CONSTRAINT saff_fixtures_home_club_id_fkey
        FOREIGN KEY (home_club_id) REFERENCES clubs(id) ON DELETE SET NULL;
  `);

  // saff_fixtures.away_club_id → SET NULL
  await sequelize.query(`
    ALTER TABLE saff_fixtures
      DROP CONSTRAINT IF EXISTS saff_fixtures_away_club_id_fkey,
      ADD CONSTRAINT saff_fixtures_away_club_id_fkey
        FOREIGN KEY (away_club_id) REFERENCES clubs(id) ON DELETE SET NULL;
  `);

  // saff_fixtures.match_id → SET NULL
  await sequelize.query(`
    ALTER TABLE saff_fixtures
      DROP CONSTRAINT IF EXISTS saff_fixtures_match_id_fkey,
      ADD CONSTRAINT saff_fixtures_match_id_fkey
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL;
  `);

  // saff_team_maps.club_id → SET NULL
  await sequelize.query(`
    ALTER TABLE saff_team_maps
      DROP CONSTRAINT IF EXISTS saff_team_maps_club_id_fkey,
      ADD CONSTRAINT saff_team_maps_club_id_fkey
        FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL;
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'saff_standings' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  // ── Remove unique constraints ───────────────────────────────
  await sequelize.query(`DROP INDEX IF EXISTS idx_saff_standings_team_season;`);
  await sequelize.query(
    `DROP INDEX IF EXISTS idx_saff_fixtures_match_identity;`,
  );
  await sequelize.query(
    `DROP INDEX IF EXISTS idx_saff_fixtures_match_id_unique;`,
  );

  // ── Remove performance indexes ──────────────────────────────
  await sequelize.query(`DROP INDEX IF EXISTS idx_saff_fixtures_home_club_id;`);
  await sequelize.query(`DROP INDEX IF EXISTS idx_saff_fixtures_away_club_id;`);
  await sequelize.query(`DROP INDEX IF EXISTS idx_saff_fixtures_status;`);

  // ── Revert FK constraints to defaults (NO ACTION) ──────────
  await sequelize.query(`
    ALTER TABLE saff_standings
      DROP CONSTRAINT IF EXISTS saff_standings_tournament_id_fkey,
      ADD CONSTRAINT saff_standings_tournament_id_fkey
        FOREIGN KEY (tournament_id) REFERENCES saff_tournaments(id);
  `);

  await sequelize.query(`
    ALTER TABLE saff_standings
      DROP CONSTRAINT IF EXISTS saff_standings_club_id_fkey,
      ADD CONSTRAINT saff_standings_club_id_fkey
        FOREIGN KEY (club_id) REFERENCES clubs(id);
  `);

  await sequelize.query(`
    ALTER TABLE saff_fixtures
      DROP CONSTRAINT IF EXISTS saff_fixtures_tournament_id_fkey,
      ADD CONSTRAINT saff_fixtures_tournament_id_fkey
        FOREIGN KEY (tournament_id) REFERENCES saff_tournaments(id);
  `);

  await sequelize.query(`
    ALTER TABLE saff_fixtures
      DROP CONSTRAINT IF EXISTS saff_fixtures_home_club_id_fkey,
      ADD CONSTRAINT saff_fixtures_home_club_id_fkey
        FOREIGN KEY (home_club_id) REFERENCES clubs(id);
  `);

  await sequelize.query(`
    ALTER TABLE saff_fixtures
      DROP CONSTRAINT IF EXISTS saff_fixtures_away_club_id_fkey,
      ADD CONSTRAINT saff_fixtures_away_club_id_fkey
        FOREIGN KEY (away_club_id) REFERENCES clubs(id);
  `);

  await sequelize.query(`
    ALTER TABLE saff_fixtures
      DROP CONSTRAINT IF EXISTS saff_fixtures_match_id_fkey,
      ADD CONSTRAINT saff_fixtures_match_id_fkey
        FOREIGN KEY (match_id) REFERENCES matches(id);
  `);

  await sequelize.query(`
    ALTER TABLE saff_team_maps
      DROP CONSTRAINT IF EXISTS saff_team_maps_club_id_fkey,
      ADD CONSTRAINT saff_team_maps_club_id_fkey
        FOREIGN KEY (club_id) REFERENCES clubs(id);
  `);
}
