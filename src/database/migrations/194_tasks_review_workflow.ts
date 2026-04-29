import { QueryInterface, DataTypes } from "sequelize";
import {
  tableExists,
  addColumnIfMissing,
  removeColumnIfPresent,
} from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  if (!(await tableExists(queryInterface, "tasks"))) return;

  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_tasks_status" ADD VALUE IF NOT EXISTS 'PendingReview'`,
  );
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_tasks_status" ADD VALUE IF NOT EXISTS 'NeedsRework'`,
  );

  await addColumnIfMissing(queryInterface, "tasks", "review_note", {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  });

  await addColumnIfMissing(queryInterface, "tasks", "reviewed_by", {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
    references: { model: "users", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });

  await addColumnIfMissing(queryInterface, "tasks", "reviewed_at", {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  if (!(await tableExists(queryInterface, "tasks"))) return;

  await removeColumnIfPresent(queryInterface, "tasks", "reviewed_at");
  await removeColumnIfPresent(queryInterface, "tasks", "reviewed_by");
  await removeColumnIfPresent(queryInterface, "tasks", "review_note");
  // NOTE: PostgreSQL does not support removing enum values —
  // 'PendingReview' and 'NeedsRework' stay in enum_tasks_status
}
