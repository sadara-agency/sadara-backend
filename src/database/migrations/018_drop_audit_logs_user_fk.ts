import { sequelize } from "@config/database";

/**
 * Drop the foreign key constraint on audit_logs.user_id.
 *
 * Player portal logins produce JWTs with player_accounts.id (not users.id).
 * When those players trigger audit-logged actions (e.g. contract signing),
 * the FK constraint on audit_logs.user_id → users.id fails because the
 * player_accounts ID doesn't exist in the users table.
 *
 * Audit logs should be able to reference any authenticated entity, so the
 * FK is unnecessary. The column remains nullable UUID for context.
 */

export async function up() {
  // Only drop the FK if the audit_logs table exists (it may not on fresh DBs
  // where the table is created later by sequelize.sync or a future migration).
  const [results] = await sequelize.query(`
    SELECT to_regclass('public.audit_logs') AS tbl
  `);
  const row = results[0] as { tbl: string | null } | undefined;
  if (!row?.tbl) return; // table doesn't exist yet — nothing to drop

  await sequelize.query(`
    ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
  `);
}
