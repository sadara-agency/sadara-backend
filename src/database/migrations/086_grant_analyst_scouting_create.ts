import { sequelize } from "@config/database";

/**
 * Grant scouting:create permission to the Analyst role.
 *
 * Analysts need to initiate scouting screenings (POST /scouting/screening)
 * to evaluate players. Previously they only had read access, which blocked
 * the "Start Screening" action in the scouting pipeline.
 */
export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(
    `UPDATE role_permissions
       SET can_create = true,
           updated_at = NOW()
     WHERE role = 'Analyst' AND module = 'scouting'`,
  );
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(
    `UPDATE role_permissions
       SET can_create = false,
           updated_at = NOW()
     WHERE role = 'Analyst' AND module = 'scouting'`,
  );
}
