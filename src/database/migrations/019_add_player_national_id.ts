import { sequelize } from "@config/database";

/**
 * Add national_id column to players table.
 *
 * This stores the player's government-issued ID number (هوية رقم)
 * which is required for contract PDFs.
 */
export async function up(): Promise<void> {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE players ADD COLUMN IF NOT EXISTS national_id VARCHAR(255) DEFAULT NULL;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down(): Promise<void> {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE players DROP COLUMN IF EXISTS national_id;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
