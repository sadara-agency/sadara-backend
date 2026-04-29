// ─────────────────────────────────────────────────────────────
// Migration 186 — Phase D: spl_backfill_runs table
//
// Tracks historical backfill progress so long-running ops can be
// observed + resumed.
// ─────────────────────────────────────────────────────────────

import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await tableExists(queryInterface, "spl_backfill_runs")) return;

  await queryInterface.createTable("spl_backfill_runs", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    season_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    scope: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("NOW()"),
    },
    finished_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    summary: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("NOW()"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("NOW()"),
    },
  });

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_spl_backfill_runs_season
    ON spl_backfill_runs (season_id)
  `);
  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_spl_backfill_runs_status
    ON spl_backfill_runs (status)
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await tableExists(queryInterface, "spl_backfill_runs")) {
    await queryInterface.dropTable("spl_backfill_runs");
  }
}
