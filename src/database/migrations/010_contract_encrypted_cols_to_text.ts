import { sequelize } from "@config/database";

/**
 * Migration: Change encrypted financial columns from DECIMAL to TEXT.
 *
 * baseSalary, commissionPct, totalCommission are encrypted at rest via
 * AES-256-GCM (beforeSave hook). The encrypted output is a base64 string
 * (iv:tag:ciphertext) which cannot be stored in a DECIMAL column.
 *
 * Steps:
 *  1. Add temporary TEXT columns
 *  2. Copy existing numeric data as text (plain numbers become strings)
 *  3. Drop the old DECIMAL columns
 *  4. Rename the temp columns
 */
export async function up() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE contracts
        ALTER COLUMN base_salary TYPE TEXT USING base_salary::TEXT;
      ALTER TABLE contracts
        ALTER COLUMN commission_pct TYPE TEXT USING commission_pct::TEXT;
      ALTER TABLE contracts
        ALTER COLUMN total_commission TYPE TEXT USING total_commission::TEXT;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE contracts
        ALTER COLUMN base_salary TYPE DECIMAL(15,2) USING base_salary::NUMERIC(15,2);
      ALTER TABLE contracts
        ALTER COLUMN commission_pct TYPE DECIMAL(5,2) USING commission_pct::NUMERIC(5,2);
      ALTER TABLE contracts
        ALTER COLUMN total_commission TYPE DECIMAL(15,2) USING total_commission::NUMERIC(15,2);
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
