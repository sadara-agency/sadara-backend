import { sequelize } from "@config/database";

/**
 * Adds a composite index on audit_logs(entity, entity_id, logged_at)
 * to speed up LATERAL join lookups in getLegalTurnaround and similar
 * dashboard queries that filter by entity + entity_id and order by logged_at.
 */
export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_entity_id_logged_at
      ON audit_logs(entity, entity_id, logged_at)
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_audit_logs_entity_entity_id_logged_at
  `);
}
