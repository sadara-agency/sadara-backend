// ═══════════════════════════════════════════════════════════════
// Migration 210: Seed default permissions for ContentManager,
// Approver, and Publisher roles (added to the role enum after
// migration 145 already seeded SportingDirector).
//
// Idempotent — uses ON CONFLICT (role, module) DO UPDATE so it
// safely re-runs and aligns with the canonical defaults.
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, QueryTypes } from "sequelize";

type Perm = {
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

const r = (module: string): Perm => ({
  module,
  canCreate: false,
  canRead: true,
  canUpdate: false,
  canDelete: false,
});

const crud = (module: string): Perm => ({
  module,
  canCreate: true,
  canRead: true,
  canUpdate: true,
  canDelete: true,
});

const ru = (module: string): Perm => ({
  module,
  canCreate: false,
  canRead: true,
  canUpdate: true,
  canDelete: false,
});

const ROLE_DEFAULTS: Record<string, Perm[]> = {
  ContentManager: [
    crud("designs"),
    r("players"),
    r("clubs"),
    r("matches"),
    r("calendar"),
    r("notifications"),
    r("tasks"),
    r("documents"),
    r("dashboard"),
  ],
  Approver: [
    ru("approvals"),
    r("designs"),
    r("contracts"),
    r("offers"),
    r("documents"),
    r("calendar"),
    r("notifications"),
    r("tasks"),
    r("dashboard"),
  ],
  Publisher: [
    ru("designs"),
    r("calendar"),
    r("notifications"),
    r("tasks"),
    r("dashboard"),
  ],
};

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sequelize = queryInterface.sequelize;

  // Guard: role_permissions table must exist (fresh-DB safety)
  const tableExists = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'role_permissions'
     ) AS exists`,
    { type: QueryTypes.SELECT },
  );
  if (!tableExists[0]?.exists) return;

  for (const [role, perms] of Object.entries(ROLE_DEFAULTS)) {
    for (const perm of perms) {
      await sequelize.query(
        `INSERT INTO role_permissions
           (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
         VALUES
           (gen_random_uuid(), :role, :module, :canCreate, :canRead, :canUpdate, :canDelete, NOW(), NOW())
         ON CONFLICT (role, module) DO UPDATE
           SET can_create = EXCLUDED.can_create,
               can_read   = EXCLUDED.can_read,
               can_update = EXCLUDED.can_update,
               can_delete = EXCLUDED.can_delete,
               updated_at = NOW()`,
        {
          replacements: {
            role,
            module: perm.module,
            canCreate: perm.canCreate,
            canRead: perm.canRead,
            canUpdate: perm.canUpdate,
            canDelete: perm.canDelete,
          },
          type: QueryTypes.RAW,
        },
      );
    }
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sequelize = queryInterface.sequelize;

  const tableExists = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'role_permissions'
     ) AS exists`,
    { type: QueryTypes.SELECT },
  );
  if (!tableExists[0]?.exists) return;

  await sequelize.query(
    `DELETE FROM role_permissions
     WHERE role IN ('ContentManager', 'Approver', 'Publisher')`,
    { type: QueryTypes.RAW },
  );
}
