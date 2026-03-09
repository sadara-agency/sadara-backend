import { sequelize } from "../../config/database";

/**
 * Add national_id column to players table.
 *
 * This stores the player's government-issued ID number (هوية رقم)
 * which is required for contract PDFs.
 */
export async function up(): Promise<void> {
  await sequelize.query(`
    ALTER TABLE players
    ADD COLUMN IF NOT EXISTS national_id VARCHAR(255) DEFAULT NULL;
  `);
}
