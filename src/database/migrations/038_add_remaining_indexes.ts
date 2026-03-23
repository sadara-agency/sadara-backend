// ═══════════════════════════════════════════════════════════════
// Migration 038: Add remaining indexes
//
// Adds indexes on frequently queried columns across models
// not covered by migrations 030 and 033:
//   approval_requests, notifications, gates, gate_checklists,
//   signature_requests, signature_signers, clearances, watchlists,
//   screening_cases, training_enrollments, training_activities,
//   referrals, technical_reports
//
// All indexes use IF NOT EXISTS for idempotency.
// Sync-created tables guarded with DO $$ blocks.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

const INDEXES = [
  // ── approval_requests ──
  `CREATE INDEX IF NOT EXISTS idx_approval_requests_status
   ON approval_requests (status)`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_entity
   ON approval_requests (entity_type, entity_id)`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by
   ON approval_requests (requested_by)`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_created
   ON approval_requests (created_at)`,

  // ── notifications ──
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_id
   ON notifications (user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_notifications_user_source
   ON notifications (user_id, source_type)`,

  `CREATE INDEX IF NOT EXISTS idx_notifications_created
   ON notifications (created_at)`,

  // ── gates ──
  `CREATE INDEX IF NOT EXISTS idx_gates_player
   ON gates (player_id)`,

  `CREATE INDEX IF NOT EXISTS idx_gates_status
   ON gates (status)`,

  `CREATE INDEX IF NOT EXISTS idx_gates_player_status
   ON gates (player_id, status)`,

  // ── gate_checklists ──
  `CREATE INDEX IF NOT EXISTS idx_gate_checklists_gate
   ON gate_checklists (gate_id)`,

  // ── signature_requests (esignatures) ──
  `CREATE INDEX IF NOT EXISTS idx_sig_requests_status
   ON signature_requests (status)`,

  `CREATE INDEX IF NOT EXISTS idx_sig_requests_created
   ON signature_requests (created_at)`,

  // ── signature_signers ──
  `CREATE INDEX IF NOT EXISTS idx_sig_signers_request
   ON signature_signers (signature_request_id)`,

  `CREATE INDEX IF NOT EXISTS idx_sig_signers_user
   ON signature_signers (user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_sig_signers_status
   ON signature_signers (status)`,

  // ── clearances ──
  `CREATE INDEX IF NOT EXISTS idx_clearances_player
   ON clearances (player_id)`,

  `CREATE INDEX IF NOT EXISTS idx_clearances_contract
   ON clearances (contract_id)`,

  `CREATE INDEX IF NOT EXISTS idx_clearances_status
   ON clearances (status)`,

  // ── watchlists (scouting) ──
  `CREATE INDEX IF NOT EXISTS idx_watchlists_status
   ON watchlists (status)`,

  `CREATE INDEX IF NOT EXISTS idx_watchlists_scouted_by
   ON watchlists (scouted_by)`,

  // ── screening_cases (scouting) ──
  `CREATE INDEX IF NOT EXISTS idx_screening_cases_watchlist
   ON screening_cases (watchlist_id)`,

  `CREATE INDEX IF NOT EXISTS idx_screening_cases_status
   ON screening_cases (status)`,

  // ── training_enrollments ──
  `CREATE INDEX IF NOT EXISTS idx_enrollments_player
   ON training_enrollments (player_id)`,

  `CREATE INDEX IF NOT EXISTS idx_enrollments_course
   ON training_enrollments (course_id)`,

  `CREATE INDEX IF NOT EXISTS idx_enrollments_status
   ON training_enrollments (status)`,

  // ── training_activities ──
  `CREATE INDEX IF NOT EXISTS idx_training_activities_player
   ON training_activities (player_id)`,

  `CREATE INDEX IF NOT EXISTS idx_training_activities_enrollment
   ON training_activities (enrollment_id)`,

  // ── referrals ──
  `CREATE INDEX IF NOT EXISTS idx_referrals_player
   ON referrals (player_id)`,

  `CREATE INDEX IF NOT EXISTS idx_referrals_status
   ON referrals (status)`,

  `CREATE INDEX IF NOT EXISTS idx_referrals_created_by
   ON referrals (created_by)`,

  // ── technical_reports ──
  `CREATE INDEX IF NOT EXISTS idx_reports_player
   ON technical_reports (player_id)`,

  `CREATE INDEX IF NOT EXISTS idx_reports_status
   ON technical_reports (status)`,

  `CREATE INDEX IF NOT EXISTS idx_reports_created_by
   ON technical_reports (created_by)`,
];

export async function up() {
  const t = await sequelize.transaction();
  try {
    for (const sql of INDEXES) {
      const match = sql.match(/ON\s+(\w+)\s/i);
      const table = match?.[1] ?? "";

      // Guard ALL tables — some may not exist yet (sync-created or not yet migrated)
      await sequelize.query(
        `DO $$ BEGIN
           IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}') THEN
             EXECUTE '${sql.replace(/'/g, "''")}';
           END IF;
         END $$`,
        { transaction: t },
      );
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function down() {
  // Drop all indexes created above
  const dropStatements = INDEXES.map((sql) => {
    const match = sql.match(/IF NOT EXISTS\s+(\w+)/i);
    return match ? `DROP INDEX IF EXISTS ${match[1]}` : null;
  }).filter(Boolean);

  const t = await sequelize.transaction();
  try {
    for (const sql of dropStatements) {
      await sequelize.query(sql!, { transaction: t });
    }
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}
