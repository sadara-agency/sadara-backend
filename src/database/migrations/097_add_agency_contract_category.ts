import { sequelize } from "@config/database";

/**
 * Migration 097: Add "Agency" to contract category enum
 *
 * The PRD specifies three contract categories: Club, Sponsorship, and
 * Agency Agreement. This adds the missing "Agency" value to the
 * PostgreSQL enum.
 */

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_type WHERE typname = 'enum_contracts_category'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    ALTER TYPE "enum_contracts_category"
    ADD VALUE IF NOT EXISTS 'Agency';
  `);
}

export async function down() {
  // PostgreSQL does not support removing values from an existing enum.
  // The "Agency" value will remain but is harmless if unused.
}
