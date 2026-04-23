import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await queryInterface.sequelize.query(`
    ALTER TABLE tickets  ADD COLUMN IF NOT EXISTS display_id VARCHAR(20) UNIQUE;
    ALTER TABLE tasks    ADD COLUMN IF NOT EXISTS display_id VARCHAR(20) UNIQUE;
    ALTER TABLE injuries ADD COLUMN IF NOT EXISTS display_id VARCHAR(20) UNIQUE;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await queryInterface.removeColumn("tickets", "display_id");
  await queryInterface.removeColumn("tasks", "display_id");
  await queryInterface.removeColumn("injuries", "display_id");
}
