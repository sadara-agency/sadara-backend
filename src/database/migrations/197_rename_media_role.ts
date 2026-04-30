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

async function renameRole(
  qi: QueryInterface,
  fromValue: string,
  toValue: string,
): Promise<void> {
  for (const { table, column } of VARCHAR_TABLES) {
    if (await tableExists(qi, table)) {
      await qi.sequelize.query(
        `UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`,
        { type: QueryTypes.UPDATE, bind: [toValue, fromValue] },
      );
    }
  }

  // Best-effort: rename legacy PG ENUM labels if those enum types still exist.
  // PG 10+ supports ALTER TYPE ... RENAME VALUE.
  for (const enumName of ["user_role", "enum_users_role"]) {
    if (await enumValueExists(qi, enumName, fromValue)) {
      await qi.sequelize.query(
        `ALTER TYPE "${enumName}" RENAME VALUE '${fromValue}' TO '${toValue}'`,
      );
    }
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
