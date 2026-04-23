import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'offers' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  // Discover the actual enum type name for offers.status
  // (Sequelize may use enum_offers_status, or pg may assign a different name)
  const [row] = await sequelize.query<{ typname: string }>(
    `SELECT t.typname FROM pg_type t
     JOIN pg_attribute a ON a.atttypid = t.oid
     JOIN pg_class c ON a.attrelid = c.oid
     WHERE c.relname = 'offers' AND a.attname = 'status' AND t.typtype = 'e'`,
    { type: QueryTypes.SELECT },
  );

  if (!row) {
    // No enum type found — status column may use CHECK or VARCHAR; nothing to alter
    return;
  }

  const typeName = row.typname;

  await sequelize.query(
    `ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'Accepted'`,
  );
  await sequelize.query(
    `ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'Rejected'`,
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
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'offers' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  // Revert Accepted/Rejected back to Closed
  await sequelize.query(
    `UPDATE offers SET status = 'Closed' WHERE status IN ('Accepted', 'Rejected')`,
  );
  // Cannot remove enum values in PostgreSQL without recreating the type
}
