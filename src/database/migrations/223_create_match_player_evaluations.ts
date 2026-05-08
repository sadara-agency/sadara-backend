import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("match_player_evaluations", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "RESTRICT",
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: "matches", key: "id" },
      onDelete: "SET NULL",
    },
    analyst_id: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    // Match context (denormalized — avoids joins on every read)
    match_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    opponent: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    competition: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    player_position: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },
    minutes_played: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    // Overall (1–10)
    overall_rating: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    // Fitness (1–5 each)
    fit_strength: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    fit_speed: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    fit_agility: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    fit_flexibility: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    fit_endurance: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    // Technical (1–5 each)
    tech_dribbling: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_passing: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_inside_kick: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_outside_kick: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_trapping: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_heading: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_chest_control: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_thigh_control: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_ball_absorption: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_assimilation: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_concentration: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_quick_thinking: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_coordination: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tech_reaction_speed: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    // Tactical (1–5 each)
    tac_attacking: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tac_defending: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tac_positioning: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tac_movement: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tac_tactics: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    tac_assimilation: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    // Match Contribution (1–5 each)
    con_offensive: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    con_defensive: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    con_crosses: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    con_dribbles: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    con_key_passes: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    con_shots: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    con_tackles: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    con_ball_recovery: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    con_ball_loss: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    con_decision_making: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    con_tactical_discipline: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    // Computed scores — written at save time (no view, no live aggregation)
    fitness_score: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    technical_score: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    tactical_score: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    offensive_score: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    defensive_score: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    // Text fields
    summary: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    highlights: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    mistakes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    strengths: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    weaknesses: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    recommendation: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    needs_referral: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    referral_target: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },
    referral_id: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: "referrals", key: "id" },
      onDelete: "SET NULL",
    },
    // Lifecycle
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Draft",
    },
    approved_by: { type: DataTypes.UUID, allowNull: true, defaultValue: null },
    approved_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    revision_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    // Audit
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    display_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  // Indexes for the most common query patterns — table was just created above
  // migration-lint: disable-next-line
  await queryInterface.addIndex("match_player_evaluations", ["player_id"], {
    name: "idx_mpe_player_id",
  });
  // migration-lint: disable-next-line
  await queryInterface.addIndex("match_player_evaluations", ["match_id"], {
    name: "idx_mpe_match_id",
  });
  // migration-lint: disable-next-line
  await queryInterface.addIndex("match_player_evaluations", ["analyst_id"], {
    name: "idx_mpe_analyst_id",
  });
  // migration-lint: disable-next-line
  await queryInterface.addIndex("match_player_evaluations", ["status"], {
    name: "idx_mpe_status",
  });
  // migration-lint: disable-next-line
  await queryInterface.addIndex(
    "match_player_evaluations",
    ["player_id", "status"],
    { name: "idx_mpe_player_status" },
  );

  // Player performance summaries — one row per player, upserted on approval
  await queryInterface.createTable("player_performance_summaries", {
    player_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    eval_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    avg_overall: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    avg_fitness: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    avg_technical: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    avg_tactical: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    avg_offensive: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    avg_defensive: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    last_5_avg: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    trend: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "stable",
    },
    last_eval_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("player_performance_summaries");
  await queryInterface.dropTable("match_player_evaluations");
}
