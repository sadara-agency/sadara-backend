// ═══════════════════════════════════════════════════════════════
// Migration 030: Add composite indexes for performance
//
// Addresses missing indexes on commonly filtered/sorted columns
// identified during the performance audit.
// ═══════════════════════════════════════════════════════════════

import { QueryInterface } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  const t = await queryInterface.sequelize.transaction();
  try {
    // Tasks: cron dedup check (player + trigger_rule + auto + date + status)
    await queryInterface.addIndex(
      "tasks",
      ["player_id", "trigger_rule_id", "is_auto_created", "created_at"],
      {
        name: "idx_tasks_cron_dedup",
        where: { is_auto_created: true },
        transaction: t,
      },
    );

    // Tasks: list filtered by assignee + status
    await queryInterface.addIndex("tasks", ["assigned_to", "status"], {
      name: "idx_tasks_assignee_status",
      transaction: t,
    });

    // Contracts: player contract lookups by status
    await queryInterface.addIndex("contracts", ["player_id", "status"], {
      name: "idx_contracts_player_status",
      transaction: t,
    });

    // Performances / player_match_stats: dashboard top players trend
    await queryInterface.addIndex(
      "player_match_stats",
      ["player_id", "created_at"],
      {
        name: "idx_pms_player_created",
        transaction: t,
      },
    );

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function down(queryInterface: QueryInterface) {
  const t = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.removeIndex("tasks", "idx_tasks_cron_dedup", {
      transaction: t,
    });
    await queryInterface.removeIndex("tasks", "idx_tasks_assignee_status", {
      transaction: t,
    });
    await queryInterface.removeIndex(
      "contracts",
      "idx_contracts_player_status",
      {
        transaction: t,
      },
    );
    await queryInterface.removeIndex(
      "player_match_stats",
      "idx_pms_player_created",
      { transaction: t },
    );
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}
