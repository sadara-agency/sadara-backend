// ═══════════════════════════════════════════════════════════════
// Migration 145: Staff Monitoring foundation
//
// 1. Creates user_sessions table for explicit session tracking.
// 2. Adds heatmap-supporting index on audit_logs.
// 3. Seeds SportingDirector role permissions.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";

export async function up() {
  // Guard: core tables must exist (fresh-DB safety — matches 000_baseline pattern)
  const [usersExist] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'`,
  );
  if ((usersExist as unknown[]).length === 0) return;

  // ── 1. Create user_sessions table ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id              UUID NOT NULL,
      user_type            VARCHAR(16) NOT NULL DEFAULT 'user',
      started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_heartbeat_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at             TIMESTAMPTZ,
      duration_seconds     INTEGER,
      ip_address           VARCHAR(64),
      user_agent           VARCHAR(512),
      end_reason           VARCHAR(20),
      refresh_token_family UUID,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_sessions_user_type_check
        CHECK (user_type IN ('user', 'player')),
      CONSTRAINT user_sessions_end_reason_check
        CHECK (end_reason IN ('logout', 'refresh_revoked', 'idle_timeout', 'forced', 'expired'))
    );
  `);

  // Indexes
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started
    ON user_sessions (user_id, started_at DESC);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_open
    ON user_sessions (user_id)
    WHERE ended_at IS NULL;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at
    ON user_sessions (started_at);
  `);

  // FK constraint (idempotent)
  try {
    await sequelize.query(`
      ALTER TABLE user_sessions
        ADD CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);
  } catch {
    // Constraint already exists
  }

  // ── 2. Heatmap-supporting index on audit_logs ──
  const [auditExists] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public'`,
  );
  if ((auditExists as unknown[]).length > 0) {
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_logged_at
      ON audit_logs (user_id, logged_at DESC);
    `);
  }

  // ── 3. Seed SportingDirector permissions ──
  const sportingDirectorPerms = [
    // Core monitoring access
    {
      module: "staffMonitoring",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    // Read-only on major modules
    {
      module: "dashboard",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      module: "users",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      module: "audit",
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
      module: "clubs",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      module: "contracts",
      canCreate: false,
      canRead: true,
      canUpdate: false,
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
      module: "injuries",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      module: "reports",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    // Task management (CRU — no delete)
    {
      module: "tasks",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
  ];

  for (const perm of sportingDirectorPerms) {
    await sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES (gen_random_uuid(), 'SportingDirector', :module, :canCreate, :canRead, :canUpdate, :canDelete, NOW(), NOW())
       ON CONFLICT (role, module) DO UPDATE
         SET can_create  = EXCLUDED.can_create,
             can_read    = EXCLUDED.can_read,
             can_update  = EXCLUDED.can_update,
             can_delete  = EXCLUDED.can_delete,
             updated_at  = NOW()`,
      {
        replacements: {
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

  // Manager + Executive: read on staffMonitoring only
  for (const role of ["Manager", "Executive"]) {
    await sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES (gen_random_uuid(), :role, 'staffMonitoring', false, true, false, false, NOW(), NOW())
       ON CONFLICT (role, module) DO UPDATE
         SET can_read   = true,
             updated_at = NOW()`,
      { replacements: { role }, type: QueryTypes.RAW },
    );
  }

  console.log(
    "Migration 145: user_sessions table + audit index + SportingDirector permissions created",
  );
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS user_sessions`);

  // Remove audit index
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_audit_logs_user_logged_at;
  `);

  // Remove SportingDirector permissions
  await sequelize.query(
    `DELETE FROM role_permissions WHERE role = 'SportingDirector'`,
  );

  // Remove staffMonitoring perm from Manager/Executive
  await sequelize.query(
    `DELETE FROM role_permissions WHERE module = 'staffMonitoring' AND role IN ('Manager', 'Executive')`,
  );

  console.log("Migration 145: user_sessions table dropped");
}
