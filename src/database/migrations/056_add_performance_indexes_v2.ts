// ═══════════════════════════════════════════════════════════════
// Migration 056: Performance indexes v2
//
// Adds indexes on commonly filtered/sorted columns that were
// missing from previous index migrations (030, 033, 038, 039).
// All indexes use CREATE INDEX IF NOT EXISTS for idempotency.
// Each statement is wrapped in a try/catch so a missing table
// doesn't abort the whole migration.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_referrals_assigned_to ON referrals (assigned_to)`,
  `CREATE INDEX IF NOT EXISTS idx_referrals_status_created ON referrals (status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_injuries_player_date ON injuries (player_id, injury_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_training_enrollments_player_status ON training_enrollments (player_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_player_id ON invoices (player_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_player_id ON expenses (player_id)`,
  `CREATE INDEX IF NOT EXISTS idx_approval_steps_approval_id ON approval_steps (approval_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rfp_hidden ON role_field_permissions (role, module) WHERE hidden = true`,
];

export async function up() {
  for (const sql of INDEXES) {
    try {
      await sequelize.query(sql);
    } catch {
      // Table may not exist — skip silently
    }
  }
}

export async function down() {
  const names = INDEXES.map((sql) => {
    const m = sql.match(/IF NOT EXISTS\s+(\w+)/i);
    return m?.[1];
  }).filter(Boolean);

  for (const name of names) {
    try {
      await sequelize.query(`DROP INDEX IF EXISTS ${name}`);
    } catch {
      // Ignore
    }
  }
}
