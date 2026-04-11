import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable("tactical_reports", {
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
    analyst_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "1-12",
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    title_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    summary_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tactical_strengths: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    tactical_weaknesses: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    recommendations: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    kpi_snapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    matches_analyzed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "draft",
      comment: "draft | published",
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex(
    "tactical_reports",
    ["player_id", "month", "year"],
    {
      name: "tactical_reports_player_period_idx",
    },
  );
  await queryInterface.addIndex("tactical_reports", ["status"], {
    name: "tactical_reports_status_idx",
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("tactical_reports");
}
