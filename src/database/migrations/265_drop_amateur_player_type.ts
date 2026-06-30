import { QueryInterface, QueryTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

// Business decision: player/contract types are now only Pro/Youth (playerType)
// and Professional/Youth (playerContractType). "Amateur" is removed.
// Postgres can't drop a single enum value, so we convert both enum columns to
// VARCHAR(50) (the project convention — Zod validates the allowed values) and
// drop the now-unused enum types. No data backfill: no Amateur rows exist.

// Discover the actual enum type backing a column (Sequelize auto-names vary
// across DBs). Returns the type name, or null if the column isn't an enum.
async function enumTypeName(
  queryInterface: QueryInterface,
  table: string,
  column: string,
): Promise<string | null> {
  const rows = await queryInterface.sequelize.query<{ typname: string }>(
    `SELECT t.typname FROM pg_type t
       JOIN pg_attribute a ON a.atttypid = t.oid
       JOIN pg_class c ON a.attrelid = c.oid
      WHERE c.relname = :table AND a.attname = :column AND t.typtype = 'e'`,
    { type: QueryTypes.SELECT, replacements: { table, column } },
  );
  return rows[0]?.typname ?? null;
}

async function enumToVarchar(
  queryInterface: QueryInterface,
  table: string,
  column: string,
): Promise<void> {
  if (!(await tableExists(queryInterface, table))) return;

  const typname = await enumTypeName(queryInterface, table, column);
  if (!typname) return; // already varchar (e.g. fresh DB with updated models)

  await queryInterface.sequelize.query(
    `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE VARCHAR(50) USING "${column}"::text`,
  );
  await queryInterface.sequelize.query(`DROP TYPE "${typname}"`);
}

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await enumToVarchar(queryInterface, "players", "player_type");
  await enumToVarchar(queryInterface, "contracts", "player_contract_type");
}

export async function down(): Promise<void> {
  // Irreversible: the Amateur enum value and the enum types are not restored.
  // Columns remain VARCHAR(50); recreating the pg enums would require knowing
  // every historical value. No-op down.
}
