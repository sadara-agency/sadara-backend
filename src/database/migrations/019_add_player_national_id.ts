import { sequelize } from "@config/database";

/**
 * Add national_id column to players table.
 *
 * This stores the player's government-issued ID number (هوية رقم)
 * which is required for contract PDFs.
 */
export async function up(): Promise<void> {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE players ADD COLUMN IF NOT EXISTS national_id VARCHAR(255) DEFAULT NULL;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down(): Promise<void> {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE players DROP COLUMN IF EXISTS national_id;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
