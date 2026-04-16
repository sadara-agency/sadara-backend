import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  // trigger_rule_id was incorrectly created as UUID and FK'd to a legacy
  // trigger_rules table (5 seeded rows, never used by application code).
  // Auto-task rules use string identifiers (e.g. "contract_legal_review") from
  // DEFAULT_TASK_RULE_CONFIG — not UUIDs. Drop the orphaned FK, convert type.
  await queryInterface.sequelize.query(
    `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_trigger_rule_id_fkey`,
  );
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_tasks_cron_dedup`,
  );
  await queryInterface.sequelize.query(`
    ALTER TABLE tasks
    ALTER COLUMN trigger_rule_id TYPE VARCHAR(100)
    USING trigger_rule_id::TEXT
  `);
  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_cron_dedup
    ON tasks (player_id, trigger_rule_id, is_auto_created, created_at)
    WHERE is_auto_created = true
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  // Reverting to UUID will fail if any string rule IDs have been written.
  // The FK to trigger_rules is not restored (that table is legacy/unused).
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_tasks_cron_dedup`,
  );
  await queryInterface.sequelize.query(`
    ALTER TABLE tasks
    ALTER COLUMN trigger_rule_id TYPE UUID
    USING trigger_rule_id::UUID
  `);
  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_cron_dedup
    ON tasks (player_id, trigger_rule_id, is_auto_created, created_at)
    WHERE is_auto_created = true
  `);
}
