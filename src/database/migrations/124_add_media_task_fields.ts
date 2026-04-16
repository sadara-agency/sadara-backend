import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  // Extend the existing tasks.type PostgreSQL enum
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_tasks_type" ADD VALUE IF NOT EXISTS 'Media'`,
  );

  // Which kind of creative content (match_cover, post, story, etc.)
  await queryInterface.addColumn("tasks", "media_task_type", {
    type: DataTypes.STRING(50),
    allowNull: true,
  });

  // Which platforms this work targets (JSONB array: instagram, twitter, etc.)
  await queryInterface.addColumn("tasks", "media_platforms", {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  });

  // Uploaded deliverable files (JSONB array of {url, thumbnailUrl, uploadedBy, uploadedAt, caption})
  await queryInterface.addColumn("tasks", "deliverables", {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.removeColumn("tasks", "deliverables");
  await queryInterface.removeColumn("tasks", "media_platforms");
  await queryInterface.removeColumn("tasks", "media_task_type");
  // NOTE: PostgreSQL does not support removing enum values — 'Media' stays in the enum
}
