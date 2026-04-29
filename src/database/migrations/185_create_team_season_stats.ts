// ─────────────────────────────────────────────────────────────
// Migration 185 — Phase C: Pulselive team-season stats + Club.pulseLiveTeamId
//
// 1. Adds clubs.pulse_live_team_id (separate from spl_team_id)
// 2. Creates team_season_stats with UNIQUE(club_id, comp_season_id)
// ─────────────────────────────────────────────────────────────

import { QueryInterface, DataTypes } from "sequelize";
import {
  addColumnIfMissing,
  removeColumnIfPresent,
  tableExists,
} from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // 1. clubs.pulse_live_team_id
  await addColumnIfMissing(queryInterface, "clubs", "pulse_live_team_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  // 2. team_season_stats table — createTable is idempotent by name in umzug
  if (!(await tableExists(queryInterface, "team_season_stats"))) {
    await queryInterface.createTable("team_season_stats", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      club_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "clubs", key: "id" },
        onDelete: "CASCADE",
      },
      pulse_live_team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      comp_season_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      season_label: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      stats: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      provider_source: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "pulselive",
      },
      last_synced_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal("NOW()"),
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
      CREATE UNIQUE INDEX IF NOT EXISTS uq_team_season_stats_club_compseason
      ON team_season_stats (club_id, comp_season_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_team_season_stats_season
      ON team_season_stats (season_label)
    `);
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await tableExists(queryInterface, "team_season_stats")) {
    await queryInterface.dropTable("team_season_stats");
  }
  await removeColumnIfPresent(queryInterface, "clubs", "pulse_live_team_id");
}
