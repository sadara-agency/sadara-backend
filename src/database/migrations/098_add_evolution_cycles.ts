import { QueryInterface, DataTypes } from "sequelize";

/**
 * Migration 098: Add Evolution Cycles framework
 *
 * Creates `evolution_cycles` table to group journey stages into structured
 * career progression cycles (Diagnostic → Foundation → Integration → Mastery).
 *
 * Adds `phase`, `evolution_cycle_id`, `blocker_description`, and `target_kpi`
 * columns to `player_journeys` for per-stage phase tracking.
 */
export async function up(queryInterface: QueryInterface) {
  // 1. Create evolution_cycles table
  await queryInterface.createTable("evolution_cycles", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    blocker_summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Primary career blocker this cycle addresses",
    },
    blocker_summary_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tier: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "StrugglingTalent",
      comment:
        "Current player tier: StrugglingTalent, DevelopingPerformer, MatchReadyPro, PeakPerformer",
    },
    current_phase: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Diagnostic",
      comment: "Active phase: Diagnostic, Foundation, Integration, Mastery",
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Active",
      comment: "Cycle status: Active, Completed, Paused",
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    expected_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    actual_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    target_kpis: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Array of { metric, baseline, target, current } objects",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("evolution_cycles", ["player_id"]);
  await queryInterface.addIndex("evolution_cycles", ["status"]);
  await queryInterface.addIndex("evolution_cycles", ["player_id", "status"]);

  // 2. Add phase + cycle fields to player_journeys
  await queryInterface.addColumn("player_journeys", "phase", {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
    comment: "Evolution phase: Diagnostic, Foundation, Integration, Mastery",
  });

  await queryInterface.addColumn("player_journeys", "evolution_cycle_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "evolution_cycles", key: "id" },
    onDelete: "SET NULL",
  });

  await queryInterface.addColumn("player_journeys", "blocker_description", {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "What specific blocker this stage addresses",
  });

  await queryInterface.addColumn("player_journeys", "target_kpi", {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: "Measurable KPI target for this stage",
  });

  await queryInterface.addIndex("player_journeys", ["evolution_cycle_id"]);
  await queryInterface.addIndex("player_journeys", ["phase"]);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn("player_journeys", "target_kpi");
  await queryInterface.removeColumn("player_journeys", "blocker_description");
  await queryInterface.removeColumn("player_journeys", "evolution_cycle_id");
  await queryInterface.removeColumn("player_journeys", "phase");
  await queryInterface.dropTable("evolution_cycles");
}
