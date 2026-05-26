import { QueryInterface, QueryTypes } from "sequelize";

const OLD_ROLE = "Media";
const NEW_ROLE = "GraphicDesigner";

const VARCHAR_TABLES: Array<{ table: string; column: string }> = [
  { table: "users", column: "role" },
  { table: "role_permissions", column: "role" },
  { table: "role_field_permissions", column: "role" },
];

async function tableExists(
  qi: QueryInterface,
  table: string,
): Promise<boolean> {
  const [row] = await qi.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [table] },
  );
  return row?.exists === true;
}

async function enumValueExists(
  qi: QueryInterface,
  enumName: string,
  value: string,
): Promise<boolean> {
  const [row] = await qi.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       WHERE t.typname = $1 AND e.enumlabel = $2
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [enumName, value] },
  );
  return row?.exists === true;
}

// Returns the native ENUM type backing a column, or null if the column is
// VARCHAR/text (or the table/column doesn't exist). On model-sync DBs the
// role columns are native PG enums; on SQL-migration DBs they are VARCHAR.
async function columnEnumType(
  qi: QueryInterface,
  table: string,
  column: string,
): Promise<string | null> {
  const [row] = await qi.sequelize.query<{
    data_type: string;
    udt_name: string;
  }>(
    `SELECT data_type, udt_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    { type: QueryTypes.SELECT, bind: [table, column] },
  );
  if (row && row.data_type === "USER-DEFINED") return row.udt_name;
  return null;
}

async function renameRole(
  qi: QueryInterface,
  fromValue: string,
  toValue: string,
): Promise<void> {
  // 1. Rename the PG ENUM label FIRST. ALTER TYPE ... RENAME VALUE updates
  //    every row using that value in place — and it must run before any
  //    UPDATE that references `toValue` as a literal, otherwise Postgres
  //    rejects the literal with "invalid input value for enum" (it validates
  //    the literal even when zero rows match).
  for (const enumName of ["user_role", "enum_users_role"]) {
    if (await enumValueExists(qi, enumName, fromValue)) {
      await qi.sequelize.query(
        `ALTER TYPE "${enumName}" RENAME VALUE '${fromValue}' TO '${toValue}'`,
      );
    }
  }

  // 2. For columns NOT backed by a native enum (i.e. VARCHAR/text), the rename
  //    above did nothing, so migrate the data with a plain UPDATE. Enum-backed
  //    columns are already handled by step 1 and must be skipped here.
  for (const { table, column } of VARCHAR_TABLES) {
    if (!(await tableExists(qi, table))) continue;
    if (await columnEnumType(qi, table, column)) continue; // enum: already renamed
    await qi.sequelize.query(
      `UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`,
      { type: QueryTypes.UPDATE, bind: [toValue, fromValue] },
    );
  }
}

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await renameRole(queryInterface, OLD_ROLE, NEW_ROLE);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await renameRole(queryInterface, NEW_ROLE, OLD_ROLE);
}
