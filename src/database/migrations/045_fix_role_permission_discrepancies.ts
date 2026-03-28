import { sequelize } from "@config/database";

/**
 * Fix role_permissions discrepancies where the seed data granted
 * broader access than the intended RBAC config (rbac.config.ts).
 *
 * Source of truth: frontend/src/lib/rbac.config.ts NAV_SECTIONS roles[].
 *
 * Discrepancies fixed:
 *  - Analyst  + finance:   had canRead+canCreate, should have NO access
 *  - Coach    + scouting:  had canRead, should have NO access
 *  - Executive+ scouting:  had canRead, should have NO access
 *  - Executive+ referrals: had canRead, should have NO access
 *  - Scout    + documents: had canRead, should have NO access
 *  - Legal    + clubs:     had canRead, should have NO access
 *  - Player   + clubs:     had canRead, should have NO access
 *  - Player   + injuries:  had canRead, should have NO access
 *  - Player   + training:  had canRead, should have NO access
 *  - Player   + documents: had canRead, should have NO access
 *
 * Also: Split "users" out from "settings" module.
 *  - /dashboard/users was gated by "settings" (canRead for ALL roles)
 *  - Now uses dedicated "users" module: Admin (full CRUD), Manager (read only)
 */
export async function up() {
  // Set all CRUD flags to false for incorrectly granted permissions.
  // Using UPDATE rather than DELETE so the row stays for admin visibility.
  const fixes = [
    { role: "Analyst", module: "finance" },
    { role: "Coach", module: "scouting" },
    { role: "Executive", module: "scouting" },
    { role: "Executive", module: "referrals" },
    { role: "Scout", module: "documents" },
    { role: "Legal", module: "clubs" },
    { role: "Player", module: "clubs" },
    { role: "Player", module: "injuries" },
    { role: "Player", module: "training" },
    { role: "Player", module: "documents" },
  ];

  for (const { role, module } of fixes) {
    await sequelize.query(
      `UPDATE role_permissions
         SET can_create = false,
             can_read   = false,
             can_update = false,
             can_delete = false,
             updated_at = NOW()
       WHERE role = :role AND module = :module`,
      { replacements: { role, module } },
    );
  }

  // ── Add dedicated "users" permission module ──
  // Previously /dashboard/users was gated by "settings" which all roles could read.
  // Admin gets full CRUD, Manager gets read-only.
  await sequelize.query(`
    INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'Admin',   'users', true,  true,  true,  true,  NOW(), NOW()),
      (gen_random_uuid(), 'Manager', 'users', false, true,  false, false, NOW(), NOW()),
      -- Sportmonks: data ingestion tool, Admin/Manager only
      (gen_random_uuid(), 'Admin',   'sportmonks', true,  true,  true,  false, NOW(), NOW()),
      (gen_random_uuid(), 'Manager', 'sportmonks', false, true,  false, false, NOW(), NOW())
    ON CONFLICT (role, module) DO UPDATE SET
      can_create = EXCLUDED.can_create,
      can_read   = EXCLUDED.can_read,
      can_update = EXCLUDED.can_update,
      can_delete = EXCLUDED.can_delete,
      updated_at = NOW();
  `);
}

export async function down() {
  // Restore original seed values
  const restores = [
    {
      role: "Analyst",
      module: "finance",
      cr: true,
      cc: true,
      cu: false,
      cd: false,
    },
    {
      role: "Coach",
      module: "scouting",
      cr: true,
      cc: false,
      cu: false,
      cd: false,
    },
    {
      role: "Executive",
      module: "scouting",
      cr: true,
      cc: false,
      cu: false,
      cd: false,
    },
    {
      role: "Executive",
      module: "referrals",
      cr: true,
      cc: false,
      cu: false,
      cd: false,
    },
    {
      role: "Scout",
      module: "documents",
      cr: true,
      cc: false,
      cu: false,
      cd: false,
    },
    {
      role: "Legal",
      module: "clubs",
      cr: true,
      cc: false,
      cu: false,
      cd: false,
    },
    {
      role: "Player",
      module: "clubs",
      cr: true,
      cc: false,
      cu: false,
      cd: false,
    },
    {
      role: "Player",
      module: "injuries",
      cr: true,
      cc: false,
      cu: false,
      cd: false,
    },
    {
      role: "Player",
      module: "training",
      cr: true,
      cc: false,
      cu: false,
      cd: false,
    },
    {
      role: "Player",
      module: "documents",
      cr: true,
      cc: false,
      cu: false,
      cd: false,
    },
  ];

  for (const { role, module, cr, cc, cu, cd } of restores) {
    await sequelize.query(
      `UPDATE role_permissions
         SET can_read   = :cr,
             can_create = :cc,
             can_update = :cu,
             can_delete = :cd,
             updated_at = NOW()
       WHERE role = :role AND module = :module`,
      { replacements: { role, module, cr, cc, cu, cd } },
    );
  }
}
