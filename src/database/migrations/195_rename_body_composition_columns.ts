import { QueryInterface } from "sequelize";

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

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  for (const [from, to] of RENAMES) {
    await queryInterface.renameColumn(TABLE, from, to);
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  for (const [from, to] of RENAMES) {
    await queryInterface.renameColumn(TABLE, to, from);
  }
}
