import { QueryInterface, QueryTypes } from "sequelize";

const NEW_REFERRAL_ROLES = [
  "Legal",
  "Finance",
  "Player",
  "GraphicDesigner",
  "Executive",
  "SportingDirector",
];

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sequelize = queryInterface.sequelize;

  const [check] = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'role_permissions'
     ) AS exists`,
    { type: QueryTypes.SELECT },
  );
  if (!check?.exists) return;

  for (const role of NEW_REFERRAL_ROLES) {
    await sequelize.query(
      `INSERT INTO role_permissions
         (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES
         (gen_random_uuid(), :role, 'referrals', true, true, true, false, NOW(), NOW())
       ON CONFLICT (role, module) DO UPDATE
         SET can_create = EXCLUDED.can_create,
             can_read   = EXCLUDED.can_read,
             can_update = EXCLUDED.can_update,
             can_delete = EXCLUDED.can_delete,
             updated_at = NOW()`,
      { replacements: { role }, type: QueryTypes.RAW },
    );
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sequelize = queryInterface.sequelize;

  const [check] = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'role_permissions'
     ) AS exists`,
    { type: QueryTypes.SELECT },
  );
  if (!check?.exists) return;

  await sequelize.query(
    `DELETE FROM role_permissions
     WHERE module = 'referrals'
       AND role IN ('Legal', 'Finance', 'Player', 'GraphicDesigner', 'Executive', 'SportingDirector')`,
    { type: QueryTypes.RAW },
  );
}
