import { QueryInterface } from "sequelize";
import { tableExists } from "../migrationHelpers";

const MODULE = "matchEvaluations";

const PERMS = [
  {
    role: "Admin",
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  },
  {
    role: "Manager",
    canCreate: false,
    canRead: true,
    canUpdate: true,
    canDelete: false,
  },
  {
    role: "SportingDirector",
    canCreate: false,
    canRead: true,
    canUpdate: true,
    canDelete: false,
  },
  {
    role: "Analyst",
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  },
  {
    role: "Coach",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "TacticalCoach",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "FitnessCoach",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "GoalkeeperCoach",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "MentalCoach",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "NutritionSpecialist",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "SkillCoach",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "GymCoach",
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "Scout",
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "Player",
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "Legal",
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "Finance",
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "Executive",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "GraphicDesigner",
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
];

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const tableOk = await tableExists(queryInterface, "role_permissions");
  if (!tableOk) return;

  for (const p of PERMS) {
    await queryInterface.sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES (gen_random_uuid(), :role, :module, :canCreate, :canRead, :canUpdate, :canDelete, NOW(), NOW())
       ON CONFLICT (role, module) DO UPDATE SET
         can_create = EXCLUDED.can_create,
         can_read   = EXCLUDED.can_read,
         can_update = EXCLUDED.can_update,
         can_delete = EXCLUDED.can_delete,
         updated_at = NOW()`,
      { replacements: { ...p, module: MODULE } },
    );
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const tableOk = await tableExists(queryInterface, "role_permissions");
  if (!tableOk) return;
  await queryInterface.sequelize.query(
    `DELETE FROM role_permissions WHERE module = :module`,
    { replacements: { module: MODULE } },
  );
}
