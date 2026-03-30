import { sequelize } from "@config/database";

/**
 * Migration 060: Add sub-task support to tasks table
 *
 * - parent_task_id: self-referential FK for parent/child hierarchy (max depth 1)
 * - sort_order: ordering of sub-tasks within a parent
 * - description_html: rich text description (sanitized HTML)
 */

export async function up() {
  await sequelize.query(`
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description_html TEXT;
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
  `);
}

export async function down() {
  await sequelize.query(`DROP INDEX IF EXISTS idx_tasks_parent`);
  await sequelize.query(`
    ALTER TABLE tasks DROP COLUMN IF EXISTS description_html;
    ALTER TABLE tasks DROP COLUMN IF EXISTS sort_order;
    ALTER TABLE tasks DROP COLUMN IF EXISTS parent_task_id;
  `);
}
