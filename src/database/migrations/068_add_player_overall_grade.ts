import { sequelize } from "@config/database";

/**
 * Migration 068: Add overall_grade to players
 *
 * Stores an agency-assigned grade (A+, A, B+, B, B-, C+, C) for each player.
 */

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    ALTER TABLE players
    ADD COLUMN IF NOT EXISTS overall_grade VARCHAR(10);
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    ALTER TABLE players DROP COLUMN IF EXISTS overall_grade;
  `);
}
