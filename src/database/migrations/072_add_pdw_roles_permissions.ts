import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";

/**
 * Migration 072: Add GoalkeeperCoach & MentalCoach roles + sessions module permissions
 *
 * - Adds GoalkeeperCoach and MentalCoach to role enum (if PG enum exists)
 * - Inserts role_permissions rows for new roles across relevant modules
 * - Inserts sessions module permissions for ALL existing roles
 * - Extends referrals permissions to new roles + all coach roles
 */

export async function up() {
  // ── 1. Add new roles to enum if it exists ──
  const enumNames = ["user_role", "enum_users_role"];
  for (const name of enumNames) {
    const [exists] = await sequelize.query<{ oid: string }>(
      `SELECT oid FROM pg_type WHERE typname = '${name}'`,
      { type: QueryTypes.SELECT },
    );
    if (exists) {
      await sequelize.query(
        `ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS 'GoalkeeperCoach'`,
      );
      await sequelize.query(
        `ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS 'MentalCoach'`,
      );
    }
  }

  // ── 2. Sessions module permissions for ALL roles ──
  const allRoles = [
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
    "Media",
    "Executive",
    "GoalkeeperCoach",
    "MentalCoach",
  ];

  for (const role of allRoles) {
    const isAdmin = role === "Admin";
    const isManager = role === "Manager";
    const isCoachLike = [
      "Coach",
      "SkillCoach",
      "TacticalCoach",
      "FitnessCoach",
      "NutritionSpecialist",
      "GymCoach",
      "GoalkeeperCoach",
      "MentalCoach",
      "Analyst",
    ].includes(role);

    await sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES (gen_random_uuid(), :role, 'sessions', :canCreate, :canRead, :canUpdate, :canDelete, NOW(), NOW())
       ON CONFLICT (role, module) DO NOTHING`,
      {
        replacements: {
          role,
          canCreate: isAdmin || isManager || isCoachLike,
          canRead: isAdmin || isManager || isCoachLike || role === "Executive",
          canUpdate: isAdmin || isManager || isCoachLike,
          canDelete: isAdmin || isManager,
        },
        type: QueryTypes.INSERT,
      },
    );
  }

  // ── 3. GoalkeeperCoach permissions for existing modules ──
  const gkModules = [
    {
      module: "dashboard",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      module: "players",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      module: "referrals",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      module: "injuries",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      module: "training",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      module: "journey",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      module: "tickets",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      module: "matches",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      module: "notifications",
      canCreate: false,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    },
    {
      module: "notes",
      canCreate: true,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      module: "settings",
      canCreate: false,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      module: "tasks",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      module: "reports",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
  ];

  for (const m of gkModules) {
    await sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES (gen_random_uuid(), 'GoalkeeperCoach', :module, :canCreate, :canRead, :canUpdate, :canDelete, NOW(), NOW())
       ON CONFLICT (role, module) DO NOTHING`,
      { replacements: m, type: QueryTypes.INSERT },
    );
  }

  // ── 4. MentalCoach permissions (same as GoalkeeperCoach) ──
  for (const m of gkModules) {
    await sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES (gen_random_uuid(), 'MentalCoach', :module, :canCreate, :canRead, :canUpdate, :canDelete, NOW(), NOW())
       ON CONFLICT (role, module) DO NOTHING`,
      { replacements: m, type: QueryTypes.INSERT },
    );
  }

  // ── 5. Extend referrals permissions to all coach roles that are missing ──
  const coachRoles = [
    "Coach",
    "SkillCoach",
    "TacticalCoach",
    "FitnessCoach",
    "NutritionSpecialist",
    "GymCoach",
  ];
  for (const role of coachRoles) {
    await sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES (gen_random_uuid(), :role, 'referrals', true, true, true, false, NOW(), NOW())
       ON CONFLICT (role, module) DO NOTHING`,
      { replacements: { role }, type: QueryTypes.INSERT },
    );
  }
}

export async function down() {
  // Remove sessions permissions
  await sequelize.query(
    `DELETE FROM role_permissions WHERE module = 'sessions'`,
  );

  // Remove GoalkeeperCoach and MentalCoach permissions
  await sequelize.query(
    `DELETE FROM role_permissions WHERE role IN ('GoalkeeperCoach', 'MentalCoach')`,
  );
}
