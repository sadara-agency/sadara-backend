import { sequelize } from "@config/database";

/**
 * Migration 045 revoked ALL Player permissions on the training module.
 * However, the /my/* self-service routes (view enrollments, track activity,
 * update progress) require read, create, and update permissions.
 *
 * This migration re-grants those three flags while keeping delete revoked.
 */
export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(
    `UPDATE role_permissions
        SET can_read   = true,
            can_create = true,
            can_update = true,
            updated_at = NOW()
      WHERE role = 'Player' AND module = 'training'`,
  );
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(
    `UPDATE role_permissions
        SET can_read   = false,
            can_create = false,
            can_update = false,
            updated_at = NOW()
      WHERE role = 'Player' AND module = 'training'`,
  );
}
