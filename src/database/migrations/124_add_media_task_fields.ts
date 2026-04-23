import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_tasks_type" ADD VALUE IF NOT EXISTS 'Media'`,
  );

  await queryInterface.sequelize.query(`
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS media_task_type  VARCHAR(50),
      ADD COLUMN IF NOT EXISTS media_platforms  JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS deliverables     JSONB NOT NULL DEFAULT '[]'
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await queryInterface.removeColumn("tasks", "deliverables");
  await queryInterface.removeColumn("tasks", "media_platforms");
  await queryInterface.removeColumn("tasks", "media_task_type");
  // NOTE: PostgreSQL does not support removing enum values — 'Media' stays in the enum
}
