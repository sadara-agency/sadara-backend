import { sequelize } from "../../config/database";

/**
 * Fix GymCoach permissions — the seed previously included GymCoach in
 * ALL_ROLES, giving it canRead on every module. This migration removes
 * the excess permissions and keeps only the intended ones.
 */

const ALLOWED_MODULES = [
  "dashboard",
  "players",
  "injuries",
  "training",
  "notifications",
  "settings",
  "gym",
  "tasks",
];

export async function up() {
  // Delete GymCoach permissions for modules they shouldn't access
  await sequelize.query(
    `DELETE FROM role_permissions
     WHERE role = 'GymCoach'
       AND module NOT IN (:modules)`,
    { replacements: { modules: ALLOWED_MODULES } },
  );

  // Reset GymCoach permissions on allowed modules to correct values
  // gym: full CRUD
  await sequelize.query(
    `UPDATE role_permissions
     SET "canCreate" = true, "canRead" = true, "canUpdate" = true, "canDelete" = true
     WHERE role = 'GymCoach' AND module = 'gym'`,
  );

  // dashboard, players, injuries, training: read only
  await sequelize.query(
    `UPDATE role_permissions
     SET "canCreate" = false, "canRead" = true, "canUpdate" = false, "canDelete" = false
     WHERE role = 'GymCoach' AND module IN ('dashboard', 'players', 'injuries', 'training')`,
  );

  // notifications: read, update, delete (personal)
  await sequelize.query(
    `UPDATE role_permissions
     SET "canCreate" = false, "canRead" = true, "canUpdate" = true, "canDelete" = true
     WHERE role = 'GymCoach' AND module = 'notifications'`,
  );

  // settings: read, update
  await sequelize.query(
    `UPDATE role_permissions
     SET "canCreate" = false, "canRead" = true, "canUpdate" = true, "canDelete" = false
     WHERE role = 'GymCoach' AND module = 'settings'`,
  );

  // tasks: read, create, update (like other roles)
  await sequelize.query(
    `UPDATE role_permissions
     SET "canCreate" = true, "canRead" = true, "canUpdate" = true, "canDelete" = false
     WHERE role = 'GymCoach' AND module = 'tasks'`,
  );
}

export async function down() {
  // Re-grant canRead on all modules (revert to previous state)
  const ALL_MODULES = [
    "dashboard",
    "matches",
    "players",
    "clubs",
    "scouting",
    "referrals",
    "contracts",
    "offers",
    "gates",
    "approvals",
    "injuries",
    "training",
    "finance",
    "reports",
    "tasks",
    "notifications",
    "documents",
    "audit",
    "market-intel",
    "settings",
    "saff-data",
    "spl-sync",
    "gym",
  ];

  for (const mod of ALL_MODULES) {
    await sequelize.query(
      `INSERT INTO role_permissions (role, module, "canCreate", "canRead", "canUpdate", "canDelete", "createdAt", "updatedAt")
       VALUES ('GymCoach', :mod, false, true, false, false, NOW(), NOW())
       ON CONFLICT (role, module) DO UPDATE SET "canRead" = true`,
      { replacements: { mod } },
    );
  }
}
