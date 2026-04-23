import { sequelize } from "@config/database";

const ALL_ROLES = [
  "Admin",
  "Manager",
  "Scout",
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
  "GoalkeeperCoach",
  "MentalCoach",
  "Legal",
  "Finance",
  "Media",
  "Analyst",
  "Executive",
  "Player",
];

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  // All roles can read, create, and update messages
  for (const role of ALL_ROLES) {
    await sequelize.query(
      `
      INSERT INTO role_permissions (id, role, module, can_read, can_create, can_update, can_delete, created_at, updated_at)
      VALUES (gen_random_uuid(), :role, 'messaging', true, true, true, :canDelete, NOW(), NOW())
      ON CONFLICT (role, module) DO NOTHING;
    `,
      {
        replacements: {
          role,
          canDelete: role === "Admin" || role === "Manager",
        },
      },
    );
  }
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(
    `DELETE FROM role_permissions WHERE module = 'messaging'`,
  );
}
