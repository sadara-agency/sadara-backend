import { QueryInterface } from "sequelize";
import { tableExists } from "../migrationHelpers";

const MODULE = "matchEvaluations";

// Role permission rows for matchEvaluations module
const PERMS = [
  // Admin — full access
  {
    role: "Admin",
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  },
  // Manager / SportingDirector — read + approve (update used for approve/revise actions)
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
  // Analyst — create + read + update own
  {
    role: "Analyst",
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  },
  // Coaches — read only (service layer restricts to referred players)
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
  // Others — no access
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
  {
    role: "GymCoach",
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
      {
        replacements: { ...p, module: MODULE },
      },
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
