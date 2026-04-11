import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable("tactical_kpi_scores", {
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
    match_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "matches", key: "id" },
      onDelete: "CASCADE",
    },
    press_intensity: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment: "Defensive actions per 90 (tackles + interceptions / min * 90)",
    },
    defensive_contribution_pct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: "Percentage contribution to team defensive actions",
    },
    progressive_pass_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: "Pass accuracy % as proxy for progressive passing",
    },
    chances_created_per90: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment: "Key passes per 90 minutes",
    },
    xg_contribution: {
      type: DataTypes.DECIMAL(6, 3),
      allowNull: true,
      comment: "Estimated xG contribution (goals + key_passes * 0.25)",
    },
    territorial_control: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: "Attacking third involvement index (0-100)",
    },
    counter_press_success: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: "Duel win rate as proxy for press success (%)",
    },
    build_up_involvement: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment: "Passes per 90 as build-up involvement metric",
    },
    overall_tactical_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: "Weighted composite tactical score (0-100)",
    },
    computed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    computed_by: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "system",
      comment: "system | manual",
    },
    raw_data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex(
    "tactical_kpi_scores",
    ["player_id", "match_id"],
    {
      name: "tactical_kpi_scores_player_match_unique",
      unique: true,
    },
  );
  await queryInterface.addIndex("tactical_kpi_scores", ["player_id"], {
    name: "tactical_kpi_scores_player_id_idx",
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("tactical_kpi_scores");
}
