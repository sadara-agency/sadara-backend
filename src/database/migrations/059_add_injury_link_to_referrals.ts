import { sequelize } from "@config/database";

/**
 * Migration 059: Add injury_id FK to referrals table
 *
 * Allows Medical referrals to be cross-linked to a specific injury record,
 * enabling the unified Player Care workflow.
 */

export async function up() {
  await sequelize.query(`
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS injury_id UUID REFERENCES injuries(id) ON DELETE SET NULL;
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_referrals_injury_id ON referrals(injury_id);
  `);
}

export async function down() {
  await sequelize.query(`DROP INDEX IF EXISTS idx_referrals_injury_id`);
  await sequelize.query(
    `ALTER TABLE referrals DROP COLUMN IF EXISTS injury_id`,
  );
}
