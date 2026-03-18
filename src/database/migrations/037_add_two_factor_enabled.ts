// ═══════════════════════════════════════════════════════════════
// Migration 037: Add two_factor_enabled column to users table
//
// The settings/profile endpoint queries this column via raw SQL.
// Adding the column so the query does not 500.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS two_factor_enabled;
  `);
}
