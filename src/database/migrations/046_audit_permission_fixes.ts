import { sequelize } from "@config/database";

/**
 * Permission audit fixes (Phase 2.5).
 *
 * Source of truth: frontend/src/lib/rbac.config.ts NAV_SECTIONS roles[].
 *
 * Discrepancies fixed:
 *  - Scout + contracts: may exist in DBs seeded before migration 045.
 *    rbac.config.ts does NOT list Scout in contracts roles.
 *  - Analyst + scouting: seed gave CRU (create+read+update).
 *    Analysts should only read scouting reports, not create/edit them.
 */
export async function up() {
  // Fix 1: Revoke Scout access to contracts (safety net for older DBs)
  await sequelize.query(
    `UPDATE role_permissions
       SET can_create = false,
           can_read   = false,
           can_update = false,
           can_delete = false,
           updated_at = NOW()
     WHERE role = 'Scout' AND module = 'contracts'`,
  );

  // Fix 2: Reduce Analyst scouting from CRU to read-only
  await sequelize.query(
    `UPDATE role_permissions
       SET can_create = false,
           can_update = false,
           updated_at = NOW()
     WHERE role = 'Analyst' AND module = 'scouting'`,
  );
}

export async function down() {
  // Restore Scout contracts read (original seed value before fix)
  await sequelize.query(
    `UPDATE role_permissions
       SET can_read = true,
           updated_at = NOW()
     WHERE role = 'Scout' AND module = 'contracts'`,
  );

  // Restore Analyst scouting CRU
  await sequelize.query(
    `UPDATE role_permissions
       SET can_create = true,
           can_update = true,
           updated_at = NOW()
     WHERE role = 'Analyst' AND module = 'scouting'`,
  );
}
