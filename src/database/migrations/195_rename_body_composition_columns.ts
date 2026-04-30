import { QueryInterface, QueryTypes } from "sequelize";

const TABLE = "body_compositions";

const RENAMES: [string, string][] = [
  ["minerals_kg", "mineral_kg"],
  ["segmental_lean_right_arm", "seg_lean_right_arm_kg"],
  ["segmental_lean_left_arm", "seg_lean_left_arm_kg"],
  ["segmental_lean_trunk", "seg_lean_trunk_kg"],
  ["segmental_lean_right_leg", "seg_lean_right_leg_kg"],
  ["segmental_lean_left_leg", "seg_lean_left_leg_kg"],
  ["segmental_fat_right_arm", "seg_fat_right_arm_kg"],
  ["segmental_fat_left_arm", "seg_fat_left_arm_kg"],
  ["segmental_fat_trunk", "seg_fat_trunk_kg"],
  ["segmental_fat_right_leg", "seg_fat_right_leg_kg"],
  ["segmental_fat_left_leg", "seg_fat_left_leg_kg"],
  ["measured_bmr", "measured_bmr_kcal"],
  ["scan_device", "device_tag"],
];

async function tableExists(queryInterface: QueryInterface): Promise<boolean> {
  const rows = await queryInterface.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = '${TABLE}'
     ) AS exists`,
    { type: QueryTypes.SELECT },
  );
  return rows[0]?.exists === true;
}

async function columnExists(
  queryInterface: QueryInterface,
  column: string,
): Promise<boolean> {
  const rows = await queryInterface.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = '${TABLE}'
         AND column_name  = '${column}'
     ) AS exists`,
    { type: QueryTypes.SELECT },
  );
  return rows[0]?.exists === true;
}

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface))) return;

  for (const [from, to] of RENAMES) {
    if (await columnExists(queryInterface, from)) {
      await queryInterface.renameColumn(TABLE, from, to);
    }
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface))) return;

  for (const [from, to] of RENAMES) {
    if (await columnExists(queryInterface, to)) {
      await queryInterface.renameColumn(TABLE, to, from);
    }
  }
}
