// ─────────────────────────────────────────────────────────────
// 053 — Add extended_stats JSONB column to performances table
//
// Stores the full PulseLive stats (155+ metrics) as JSON.
// Structured columns (goals, assists, minutes, etc.) remain
// for fast indexed queries; extended_stats holds everything.
// ─────────────────────────────────────────────────────────────

import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'performances' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE performances
        ADD COLUMN extended_stats JSONB;
      COMMENT ON COLUMN performances.extended_stats
        IS 'Full PulseLive stats (155+ metrics) as JSON';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);

  // GIN index for JSONB containment queries
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_performances_extended_stats
    ON performances USING GIN (extended_stats)
    WHERE extended_stats IS NOT NULL;
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'performances' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(
    `DROP INDEX IF EXISTS idx_performances_extended_stats;`,
  );
  await sequelize.query(
    `ALTER TABLE performances DROP COLUMN IF EXISTS extended_stats;`,
  );
}
