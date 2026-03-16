// ═══════════════════════════════════════════════════════════════
// Migration 033: Add performance indexes
//
// Adds missing indexes on frequently queried columns across
// contracts, tasks, payments, invoices, injuries, valuations,
// documents, notes, audit_logs, and player_match_stats tables.
//
// All indexes use IF NOT EXISTS for idempotency.
// Tables that may not exist (audit_logs — created via Sequelize
// sync, not migrations) are guarded with DO $$ blocks.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

const INDEXES = [
  // ── player_match_stats ──
  // match.service.ts queries stats by match_id for detail views
  `CREATE INDEX IF NOT EXISTS idx_pms_match
   ON player_match_stats (match_id)`,

  `CREATE INDEX IF NOT EXISTS idx_pms_match_created
   ON player_match_stats (match_id, created_at)`,

  // ── contracts ──
  // finance.service.ts aggregates revenue per club
  `CREATE INDEX IF NOT EXISTS idx_contracts_club_status
   ON contracts (club_id, status)`,

  // cron expiry checks filter by end_date
  `CREATE INDEX IF NOT EXISTS idx_contracts_end_date
   ON contracts (end_date)`,

  // list endpoints filter by status alone
  `CREATE INDEX IF NOT EXISTS idx_contracts_status
   ON contracts (status)`,

  // ── tasks ──
  // report.service.ts joins tasks by match_id
  `CREATE INDEX IF NOT EXISTS idx_tasks_match
   ON tasks (match_id)`,

  `CREATE INDEX IF NOT EXISTS idx_tasks_match_status
   ON tasks (match_id, status)`,

  // dashboard urgent tasks filter by due_date + status
  `CREATE INDEX IF NOT EXISTS idx_tasks_due_status
   ON tasks (due_date, status)`,

  // ── payments ──
  // finance dashboard aggregates per player
  `CREATE INDEX IF NOT EXISTS idx_payments_player_status
   ON payments (player_id, status)`,

  // finance cash-flow timeline queries by paid_date
  `CREATE INDEX IF NOT EXISTS idx_payments_paid_date
   ON payments (paid_date)`,

  // ── invoices ──
  // finance dashboard aggregates per club
  `CREATE INDEX IF NOT EXISTS idx_invoices_club_status
   ON invoices (club_id, status)`,

  `CREATE INDEX IF NOT EXISTS idx_invoices_status
   ON invoices (status)`,

  // ── injuries ──
  // report.service.ts + player profile filter by player + date
  `CREATE INDEX IF NOT EXISTS idx_injuries_player_date
   ON injuries (player_id, injury_date)`,

  // dashboard active injuries count
  `CREATE INDEX IF NOT EXISTS idx_injuries_status
   ON injuries (status)`,

  // ── valuations ──
  // finance dashboard market value trend chart
  `CREATE INDEX IF NOT EXISTS idx_valuations_player_date
   ON valuations (player_id, valued_at)`,

  // ── documents ──
  // polymorphic entity lookups (list docs for a player/contract/etc.)
  `CREATE INDEX IF NOT EXISTS idx_documents_entity
   ON documents (entity_type, entity_id)`,

  // ── notes ──
  // polymorphic owner lookups
  `CREATE INDEX IF NOT EXISTS idx_notes_owner
   ON notes (owner_type, owner_id)`,
];

// Tables created via Sequelize sync (not migrations) — guard with existence check
const GUARDED_INDEXES = [
  // ── audit_logs ──
  // contract history + entity audit trail lookups
  {
    name: "idx_audit_logs_entity",
    table: "audit_logs",
    sql: `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity, entity_id)`,
  },
  // recent activity feed sorted by logged_at
  {
    name: "idx_audit_logs_logged_at",
    table: "audit_logs",
    sql: `CREATE INDEX IF NOT EXISTS idx_audit_logs_logged_at ON audit_logs (logged_at)`,
  },
];

export async function up() {
  for (const sql of INDEXES) {
    await sequelize.query(sql);
  }

  // Guarded indexes — only create if the table exists
  for (const { table, sql } of GUARDED_INDEXES) {
    await sequelize.query(`
      DO $$ BEGIN
        IF to_regclass('public.${table}') IS NOT NULL THEN
          EXECUTE '${sql.replace(/'/g, "''")}';
        END IF;
      END $$;
    `);
  }
}

export async function down() {
  const allNames = [
    ...INDEXES.map((sql) => {
      const match = sql.match(/IF NOT EXISTS (\w+)/);
      return match?.[1];
    }),
    ...GUARDED_INDEXES.map((g) => g.name),
  ].filter(Boolean);

  for (const name of allNames) {
    await sequelize.query(`DROP INDEX IF EXISTS ${name}`);
  }
}
