import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const ALL_ROLES = [
    "Admin",
    "Manager",
    "Analyst",
    "Scout",
    "Player",
    "Legal",
    "Finance",
    "Coach",
    "SkillCoach",
    "TacticalCoach",
    "FitnessCoach",
    "NutritionSpecialist",
    "GymCoach",
    "GraphicDesigner",
    "Executive",
    "GoalkeeperCoach",
    "MentalCoach",
    "SportingDirector",
  ];

  const perms = ALL_ROLES.map((role) => ({
    id: require("crypto").randomUUID(),
    role,
    module: "agenda",
    can_create: true,
    can_read: true,
    can_update: true,
    can_delete: true,
    created_at: new Date(),
    updated_at: new Date(),
  }));

  for (const perm of perms) {
    await queryInterface.sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES (:id, :role, :module, :can_create, :can_read, :can_update, :can_delete, :created_at, :updated_at)
       ON CONFLICT (role, module) DO NOTHING`,
      { replacements: perm },
    );
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.sequelize.query(
    `DELETE FROM role_permissions WHERE module = 'agenda'`,
  );
}
