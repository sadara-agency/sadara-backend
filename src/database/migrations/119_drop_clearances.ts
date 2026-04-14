import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  // Drop FK and clearance-related columns from contracts
  await queryInterface.sequelize.query(`
    ALTER TABLE contracts
      DROP COLUMN IF EXISTS terminated_by_clearance_id,
      DROP COLUMN IF EXISTS clearance_number;
  `);

  // Drop indexes on clearances (may not exist if table is already absent)
  await queryInterface.sequelize.query(`
    DROP INDEX IF EXISTS idx_clearances_player;
    DROP INDEX IF EXISTS idx_clearances_contract;
    DROP INDEX IF EXISTS idx_clearances_status;
  `);

  // Drop the clearances table
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS clearances;`);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  // Recreate clearances table (minimal schema for rollback — data is lost)
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS clearances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID NOT NULL,
      contract_id UUID NOT NULL,
      clearance_number VARCHAR(50) UNIQUE,
      reason TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'Processing',
      has_outstanding BOOLEAN NOT NULL DEFAULT false,
      outstanding_amount NUMERIC(15,2),
      outstanding_currency VARCHAR(10),
      outstanding_details TEXT,
      declaration_signed BOOLEAN NOT NULL DEFAULT false,
      notes TEXT,
      completed_at TIMESTAMPTZ,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_clearances_player ON clearances(player_id);
    CREATE INDEX IF NOT EXISTS idx_clearances_contract ON clearances(contract_id);
    CREATE INDEX IF NOT EXISTS idx_clearances_status ON clearances(status);
  `);

  // Restore clearance columns on contracts
  await queryInterface.sequelize.query(`
    ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS clearance_number VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS terminated_by_clearance_id UUID;
  `);
}
