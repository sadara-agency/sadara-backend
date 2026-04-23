import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sq = queryInterface.sequelize;

  // Fresh-DB guard: contracts table must already exist
  const [rows] = await sq.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sq.query(
    `ALTER TABLE contracts ALTER COLUMN start_date DROP NOT NULL;`,
  );
  await sq.query(`ALTER TABLE contracts ALTER COLUMN end_date DROP NOT NULL;`);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sq = queryInterface.sequelize;

  // Guard: can only re-add NOT NULL if no rows are currently null
  const [nullRows] = (await sq.query(
    `SELECT COUNT(*)::int AS n FROM contracts WHERE start_date IS NULL OR end_date IS NULL;`,
  )) as [Array<{ n: number }>, unknown];
  const n = nullRows?.[0]?.n ?? 0;
  if (n > 0) {
    console.warn(
      `[migration 142 down] Skipping NOT NULL restore: ${n} contracts still have null start/end dates.`,
    );
    return;
  }
  await sq.query(`ALTER TABLE contracts ALTER COLUMN start_date SET NOT NULL;`);
  await sq.query(`ALTER TABLE contracts ALTER COLUMN end_date SET NOT NULL;`);
}
