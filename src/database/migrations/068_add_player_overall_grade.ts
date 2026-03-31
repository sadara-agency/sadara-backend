import { sequelize } from "@config/database";

/**
 * Migration 068: Add overall_grade to players
 *
 * Stores an agency-assigned grade (A+, A, B+, B, B-, C+, C) for each player.
 */

export async function up() {
  await sequelize.query(`
    ALTER TABLE players
    ADD COLUMN IF NOT EXISTS overall_grade VARCHAR(10);
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE players DROP COLUMN IF EXISTS overall_grade;
  `);
}
