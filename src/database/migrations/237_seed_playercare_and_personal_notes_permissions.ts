import { QueryInterface, QueryTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sequelize = queryInterface.sequelize;

  if (!(await tableExists(queryInterface, "role_permissions"))) return;

  await sequelize.query(
    `INSERT INTO role_permissions
       (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
     SELECT gen_random_uuid(), role, 'playercare',
            can_create, can_read, can_update, can_delete, NOW(), NOW()
       FROM role_permissions
      WHERE module = 'referrals'
     ON CONFLICT (role, module) DO NOTHING`,
    { type: QueryTypes.RAW },
  );

  await sequelize.query(
    `INSERT INTO role_permissions
       (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
     SELECT gen_random_uuid(), r.role, 'personal-notes',
            true, true, true, true, NOW(), NOW()
       FROM (SELECT DISTINCT role FROM role_permissions) r
     ON CONFLICT (role, module) DO NOTHING`,
    { type: QueryTypes.RAW },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sequelize = queryInterface.sequelize;
  if (!(await tableExists(queryInterface, "role_permissions"))) return;

  await sequelize.query(
    `DELETE FROM role_permissions WHERE module = 'playercare'`,
    { type: QueryTypes.RAW },
  );
}
