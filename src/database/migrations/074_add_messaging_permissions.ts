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
  await sequelize.query(
    `DELETE FROM role_permissions WHERE module = 'messaging'`,
  );
}
