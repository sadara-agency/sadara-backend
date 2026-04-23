import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sq = queryInterface.sequelize;

  const [rows] = await sq.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  // Player mandate fields
  await sq.query(
    `ALTER TABLE players ADD COLUMN IF NOT EXISTS mandate_status VARCHAR(30);`,
  );
  await sq.query(
    `ALTER TABLE players ADD COLUMN IF NOT EXISTS mandate_signed_at DATE;`,
  );
  await sq.query(
    `ALTER TABLE players ADD COLUMN IF NOT EXISTS exclusive_until DATE;`,
  );

  // Offer media embargo
  await sq.query(
    `ALTER TABLE offers ADD COLUMN IF NOT EXISTS media_embargo_lifted_at TIMESTAMPTZ;`,
  );

  // Extend gate_number type to support Gate 4 (IF NOT EXISTS is idempotent)
  await sq.query(
    `ALTER TYPE "enum_gates_gate_number" ADD VALUE IF NOT EXISTS '4'`,
  );

  await sq.query(
    `CREATE INDEX IF NOT EXISTS players_mandate_status ON players (mandate_status);`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sq = queryInterface.sequelize;
  await sq.query(`DROP INDEX IF EXISTS players_mandate_status;`);
  await queryInterface.removeColumn("offers", "media_embargo_lifted_at");
  await queryInterface.removeColumn("players", "exclusive_until");
  await queryInterface.removeColumn("players", "mandate_signed_at");
  await queryInterface.removeColumn("players", "mandate_status");
  // NOTE: PostgreSQL does not support removing ENUM values — '4' stays in the type
}
