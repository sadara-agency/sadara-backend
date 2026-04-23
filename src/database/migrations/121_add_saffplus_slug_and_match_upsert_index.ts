import { QueryInterface } from "sequelize";

/**
 * Migration 121
 *
 * 1. Add `saffplus_slug` to `competitions` — SAFF+ platform slug (e.g. "roshn-saudi-league").
 *    Separate from `saff_id` (integer) so both sources can coexist without constraint collision.
 *
 * 2. Add partial unique index on `matches(provider_source, external_match_id)`
 *    to support idempotent upserts from SAFF and SAFF+ scrapers.
 *
 * Both steps use IF NOT EXISTS / DO NOTHING guards so the migration is safe to
 * re-run after a partial failure.
 */

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'competitions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  // 1. saffplus_slug column on competitions — idempotent
  await queryInterface.sequelize.query(`
    ALTER TABLE competitions
      ADD COLUMN IF NOT EXISTS saffplus_slug VARCHAR(120) UNIQUE;
  `);

  // 2. Partial unique index on matches — idempotent via DO NOTHING on existing index name
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_matches_provider_external_unique'
      ) THEN
        CREATE UNIQUE INDEX idx_matches_provider_external_unique
          ON matches (provider_source, external_match_id)
          WHERE external_match_id IS NOT NULL;
      END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END
    $$;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'competitions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_matches_provider_external_unique;`,
  );
  await queryInterface.sequelize.query(`
    ALTER TABLE competitions DROP COLUMN IF EXISTS saffplus_slug;
  `);
}
