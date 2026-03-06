import { sequelize } from "../../config/database";

export async function up() {
  // Add new enum values to offer_status
  await sequelize.query(
    `ALTER TYPE enum_offers_status ADD VALUE IF NOT EXISTS 'Accepted'`,
  );
  await sequelize.query(
    `ALTER TYPE enum_offers_status ADD VALUE IF NOT EXISTS 'Rejected'`,
  );

  // Migrate existing "Closed" offers:
  // - Offers with a convertedContractId → Accepted (they led to a contract)
  // - Offers without → keep as Closed (ambiguous, admin can re-classify)
  await sequelize.query(`
    UPDATE offers SET status = 'Accepted'
    WHERE status = 'Closed' AND converted_contract_id IS NOT NULL
  `);
}

export async function down() {
  // Revert Accepted/Rejected back to Closed
  await sequelize.query(
    `UPDATE offers SET status = 'Closed' WHERE status IN ('Accepted', 'Rejected')`,
  );
  // Cannot remove enum values in PostgreSQL without recreating the type
}
