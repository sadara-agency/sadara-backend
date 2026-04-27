import { QueryInterface, ModelAttributeColumnOptions } from "sequelize";
import { QueryTypes } from "sequelize";

export async function tableExists(
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

export async function columnExists(
  qi: QueryInterface,
  table: string,
  column: string,
): Promise<boolean> {
  const [row] = await qi.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [table, column] },
  );
  return row?.exists === true;
}

export async function indexExists(
  qi: QueryInterface,
  indexName: string,
): Promise<boolean> {
  const [row] = await qi.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_indexes
       WHERE schemaname = 'public' AND indexname = $1
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [indexName] },
  );
  return row?.exists === true;
}

export async function enumTypeExists(
  qi: QueryInterface,
  typeName: string,
): Promise<boolean> {
  const [row] = await qi.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_type
       WHERE typname = $1 AND typtype = 'e'
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [typeName] },
  );
  return row?.exists === true;
}

export async function addColumnIfMissing(
  qi: QueryInterface,
  table: string,
  column: string,
  definition: ModelAttributeColumnOptions,
): Promise<void> {
  if (!(await tableExists(qi, table))) return;
  if (await columnExists(qi, table, column)) return;
  await qi.addColumn(table, column, definition);
}

export async function removeColumnIfPresent(
  qi: QueryInterface,
  table: string,
  column: string,
): Promise<void> {
  if (!(await tableExists(qi, table))) return;
  if (!(await columnExists(qi, table, column))) return;
  await qi.removeColumn(table, column);
}
