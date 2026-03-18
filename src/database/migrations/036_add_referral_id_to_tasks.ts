// ═══════════════════════════════════════════════════════════════
// Migration 036: Add referral_id FK to tasks table
//
// Links tasks directly to referrals so auto-generated tasks
// (critical referral, overdue referral) can be queried and
// displayed in the referral detail modal.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS referral_id UUID;

    ALTER TABLE tasks
      ADD CONSTRAINT tasks_referral_id_fkey
        FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_tasks_referral_id ON tasks(referral_id);
  `);
}

export async function down() {
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_tasks_referral_id;
    ALTER TABLE tasks
      DROP CONSTRAINT IF EXISTS tasks_referral_id_fkey,
      DROP COLUMN IF EXISTS referral_id;
  `);
}
