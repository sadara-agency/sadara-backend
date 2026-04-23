import { sequelize } from "@config/database";

/**
 * Migration 063: Season sync registry + cup/knockout fields
 *
 * 1. Creates `season_syncs` table for one-time seasonal pull tracking
 * 2. Adds cup fields to `saff_fixtures` (round, leg, aggregate, penalties, extra time)
 * 3. Adds cup fields to `matches` table
 */

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'saff_fixtures' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  // 1. Season sync registry
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS season_syncs (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source          VARCHAR(20) NOT NULL,
      competition     VARCHAR(100) NOT NULL,
      competition_id  UUID REFERENCES competitions(id),
      season          VARCHAR(20) NOT NULL,
      data_type       VARCHAR(30) NOT NULL,
      status          VARCHAR(20) NOT NULL DEFAULT 'pending',
      locked_at       TIMESTAMPTZ,
      locked_by       UUID REFERENCES users(id),
      synced_at       TIMESTAMPTZ,
      record_count    INTEGER NOT NULL DEFAULT 0,
      error_message   TEXT,
      metadata        JSONB,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(source, competition, season, data_type)
    )
  `);

  // 2. Cup fields on saff_fixtures
  await sequelize.query(`
    ALTER TABLE saff_fixtures ADD COLUMN IF NOT EXISTS round VARCHAR(50);
    ALTER TABLE saff_fixtures ADD COLUMN IF NOT EXISTS leg INTEGER DEFAULT 1;
    ALTER TABLE saff_fixtures ADD COLUMN IF NOT EXISTS aggregate_home INTEGER;
    ALTER TABLE saff_fixtures ADD COLUMN IF NOT EXISTS aggregate_away INTEGER;
    ALTER TABLE saff_fixtures ADD COLUMN IF NOT EXISTS penalty_home INTEGER;
    ALTER TABLE saff_fixtures ADD COLUMN IF NOT EXISTS penalty_away INTEGER;
    ALTER TABLE saff_fixtures ADD COLUMN IF NOT EXISTS extra_time BOOLEAN DEFAULT false;
    ALTER TABLE saff_fixtures ADD COLUMN IF NOT EXISTS is_neutral_venue BOOLEAN DEFAULT false;
  `);

  // 3. Cup fields on matches
  await sequelize.query(`
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS round VARCHAR(50);
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS leg INTEGER DEFAULT 1;
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_home INTEGER;
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_away INTEGER;
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS extra_time BOOLEAN DEFAULT false;
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_neutral_venue BOOLEAN DEFAULT false;
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'saff_fixtures' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  // Matches cup fields
  await sequelize.query(`
    ALTER TABLE matches DROP COLUMN IF EXISTS is_neutral_venue;
    ALTER TABLE matches DROP COLUMN IF EXISTS extra_time;
    ALTER TABLE matches DROP COLUMN IF EXISTS penalty_away;
    ALTER TABLE matches DROP COLUMN IF EXISTS penalty_home;
    ALTER TABLE matches DROP COLUMN IF EXISTS leg;
    ALTER TABLE matches DROP COLUMN IF EXISTS round;
  `);

  // SAFF fixtures cup fields
  await sequelize.query(`
    ALTER TABLE saff_fixtures DROP COLUMN IF EXISTS is_neutral_venue;
    ALTER TABLE saff_fixtures DROP COLUMN IF EXISTS extra_time;
    ALTER TABLE saff_fixtures DROP COLUMN IF EXISTS penalty_away;
    ALTER TABLE saff_fixtures DROP COLUMN IF EXISTS penalty_home;
    ALTER TABLE saff_fixtures DROP COLUMN IF EXISTS aggregate_away;
    ALTER TABLE saff_fixtures DROP COLUMN IF EXISTS aggregate_home;
    ALTER TABLE saff_fixtures DROP COLUMN IF EXISTS leg;
    ALTER TABLE saff_fixtures DROP COLUMN IF EXISTS round;
  `);

  // Season syncs table
  await sequelize.query(`DROP TABLE IF EXISTS season_syncs`);
}
