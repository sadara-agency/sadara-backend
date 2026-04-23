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

// All indexes guarded with to_regclass — safe on both fresh and existing DBs
const GUARDED_INDEXES: { name: string; table: string; sql: string }[] = [
  // ── player_match_stats ──
  {
    name: "idx_pms_match",
    table: "player_match_stats",
    sql: "CREATE INDEX IF NOT EXISTS idx_pms_match ON player_match_stats (match_id)",
  },
  {
    name: "idx_pms_match_created",
    table: "player_match_stats",
    sql: "CREATE INDEX IF NOT EXISTS idx_pms_match_created ON player_match_stats (match_id, created_at)",
  },
  // ── contracts ──
  {
    name: "idx_contracts_club_status",
    table: "contracts",
    sql: "CREATE INDEX IF NOT EXISTS idx_contracts_club_status ON contracts (club_id, status)",
  },
  {
    name: "idx_contracts_end_date",
    table: "contracts",
    sql: "CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts (end_date)",
  },
  {
    name: "idx_contracts_status",
    table: "contracts",
    sql: "CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts (status)",
  },
  // ── tasks ──
  {
    name: "idx_tasks_match",
    table: "tasks",
    sql: "CREATE INDEX IF NOT EXISTS idx_tasks_match ON tasks (match_id)",
  },
  {
    name: "idx_tasks_match_status",
    table: "tasks",
    sql: "CREATE INDEX IF NOT EXISTS idx_tasks_match_status ON tasks (match_id, status)",
  },
  {
    name: "idx_tasks_due_status",
    table: "tasks",
    sql: "CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks (due_date, status)",
  },
  // ── payments ──
  {
    name: "idx_payments_player_status",
    table: "payments",
    sql: "CREATE INDEX IF NOT EXISTS idx_payments_player_status ON payments (player_id, status)",
  },
  {
    name: "idx_payments_paid_date",
    table: "payments",
    sql: "CREATE INDEX IF NOT EXISTS idx_payments_paid_date ON payments (paid_date)",
  },
  // ── invoices ──
  {
    name: "idx_invoices_club_status",
    table: "invoices",
    sql: "CREATE INDEX IF NOT EXISTS idx_invoices_club_status ON invoices (club_id, status)",
  },
  {
    name: "idx_invoices_status",
    table: "invoices",
    sql: "CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status)",
  },
  // ── injuries ──
  {
    name: "idx_injuries_player_date",
    table: "injuries",
    sql: "CREATE INDEX IF NOT EXISTS idx_injuries_player_date ON injuries (player_id, injury_date)",
  },
  {
    name: "idx_injuries_status",
    table: "injuries",
    sql: "CREATE INDEX IF NOT EXISTS idx_injuries_status ON injuries (status)",
  },
  // ── valuations ──
  {
    name: "idx_valuations_player_date",
    table: "valuations",
    sql: "CREATE INDEX IF NOT EXISTS idx_valuations_player_date ON valuations (player_id, valued_at)",
  },
  // ── documents ──
  {
    name: "idx_documents_entity",
    table: "documents",
    sql: "CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents (entity_type, entity_id)",
  },
  // ── notes ──
  {
    name: "idx_notes_owner",
    table: "notes",
    sql: "CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes (owner_type, owner_id)",
  },
  // ── audit_logs ──
  {
    name: "idx_audit_logs_entity",
    table: "audit_logs",
    sql: "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity, entity_id)",
  },
  {
    name: "idx_audit_logs_logged_at",
    table: "audit_logs",
    sql: "CREATE INDEX IF NOT EXISTS idx_audit_logs_logged_at ON audit_logs (logged_at)",
  },
];

export async function up() {
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
  for (const { name } of GUARDED_INDEXES) {
    await sequelize.query(`DROP INDEX IF EXISTS ${name}`);
  }
}
