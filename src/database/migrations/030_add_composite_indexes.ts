// ═══════════════════════════════════════════════════════════════
// Migration 030: Add composite indexes for performance
//
// Addresses missing indexes on commonly filtered/sorted columns
// identified during the performance audit.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  // Each index created independently — if one fails, others still succeed.
  // Using raw SQL with IF NOT EXISTS for full idempotency.
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_tasks_cron_dedup
     ON tasks (player_id, trigger_rule_id, is_auto_created, created_at)
     WHERE is_auto_created = true`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
     ON tasks (assigned_to, status)`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_contracts_player_status
     ON contracts (player_id, status)`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_pms_player_created
     ON player_match_stats (player_id, created_at)`,
  );
}

export async function down() {
  await sequelize.query(`DROP INDEX IF EXISTS idx_tasks_cron_dedup`);
  await sequelize.query(`DROP INDEX IF EXISTS idx_tasks_assignee_status`);
  await sequelize.query(`DROP INDEX IF EXISTS idx_contracts_player_status`);
  await sequelize.query(`DROP INDEX IF EXISTS idx_pms_player_created`);
}
