// 029_fix_task_status_enum.ts
// Ensures the 'Canceled' value exists in enum_tasks_status.
// The baseline migration attempted this but may have silently failed.

import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";

export async function up() {
  // Check if the enum type exists
  const typeExists = await sequelize
    .query(`SELECT 1 FROM pg_type WHERE typname = 'enum_tasks_status'`, {
      type: QueryTypes.SELECT,
    })
    .catch(() => []);

  if (!typeExists.length) return;

  // Check if 'Canceled' already exists
  const hasValue = await sequelize
    .query(
      `SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'enum_tasks_status' AND e.enumlabel = 'Canceled'`,
      { type: QueryTypes.SELECT },
    )
    .catch(() => []);

  if (!hasValue.length) {
    await sequelize.query(
      `ALTER TYPE enum_tasks_status ADD VALUE IF NOT EXISTS 'Canceled'`,
    );
  }
}

export async function down() {
  // Cannot remove enum values in PostgreSQL
}
