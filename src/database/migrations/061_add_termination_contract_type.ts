import { sequelize } from "@config/database";

/**
 * Migration 061: Add "Termination" as 9th contract type
 *
 * - Adds "Termination" value to enum_contracts_contract_type
 * - Adds termination-specific columns to contracts table
 * - Adds parent_contract_id self-referential FK
 */

export async function up() {
  await sequelize.query(
    `ALTER TYPE "enum_contracts_contract_type" ADD VALUE IF NOT EXISTS 'Termination'`,
  );

  await sequelize.query(`
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS termination_reason TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS termination_date DATE;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS clearance_number VARCHAR(50) UNIQUE;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS outstanding_amount DECIMAL(15,2) DEFAULT 0;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS outstanding_currency VARCHAR(3) DEFAULT 'SAR';
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS outstanding_details TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS has_outstanding BOOLEAN DEFAULT false;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS no_claims_declaration BOOLEAN DEFAULT false;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS declaration_text TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS parent_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_contracts_parent_contract_id ON contracts(parent_contract_id);
  `);
}

export async function down() {
  await sequelize.query(
    `DROP INDEX IF EXISTS idx_contracts_parent_contract_id`,
  );
  await sequelize.query(`
    ALTER TABLE contracts DROP COLUMN IF EXISTS parent_contract_id;
    ALTER TABLE contracts DROP COLUMN IF EXISTS declaration_text;
    ALTER TABLE contracts DROP COLUMN IF EXISTS no_claims_declaration;
    ALTER TABLE contracts DROP COLUMN IF EXISTS has_outstanding;
    ALTER TABLE contracts DROP COLUMN IF EXISTS outstanding_details;
    ALTER TABLE contracts DROP COLUMN IF EXISTS outstanding_currency;
    ALTER TABLE contracts DROP COLUMN IF EXISTS outstanding_amount;
    ALTER TABLE contracts DROP COLUMN IF EXISTS clearance_number;
    ALTER TABLE contracts DROP COLUMN IF EXISTS termination_date;
    ALTER TABLE contracts DROP COLUMN IF EXISTS termination_reason;
  `);
}
