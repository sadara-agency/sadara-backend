import { sequelize } from "@config/database";

/**
 * Migration 059: Add injury_id FK to referrals table
 *
 * Allows Medical referrals to be cross-linked to a specific injury record,
 * enabling the unified Player Care workflow.
 */

export async function up() {
  const [guard] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'injuries' AND table_schema = 'public'`,
  );
  if ((guard as unknown[]).length === 0) return;

  const [r] = await sequelize.query(
    `SELECT to_regclass('public.referrals') AS tbl`,
  );
  if (!(r as Array<{ tbl: string | null }>)[0]?.tbl) return;

  await sequelize.query(`
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS injury_id UUID REFERENCES injuries(id) ON DELETE SET NULL;
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_referrals_injury_id ON referrals(injury_id);
  `);
}

export async function down() {
  const [r] = await sequelize.query(
    `SELECT to_regclass('public.referrals') AS tbl`,
  );
  if (!(r as Array<{ tbl: string | null }>)[0]?.tbl) return;

  await sequelize.query(`DROP INDEX IF EXISTS idx_referrals_injury_id`);
  await sequelize.query(
    `ALTER TABLE referrals DROP COLUMN IF EXISTS injury_id`,
  );
}
