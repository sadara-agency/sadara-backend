import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable("development_reviews", {
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
    reviewer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    quarter_label: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "e.g. Q1-2026",
    },
    review_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    technical_assessment: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    tactical_assessment: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    physical_assessment: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    mental_assessment: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    overall_rating: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
      comment: "1.0 – 10.0",
    },
    strengths: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    development_areas: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    short_term_goals: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    long_term_goals: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    previous_goals_review: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    session_feedback_summary: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment:
        "Auto-pulled average ratings from session_feedback for the quarter",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "draft",
      comment: "draft | submitted | acknowledged",
    },
    player_acknowledged_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex(
    "development_reviews",
    ["player_id", "quarter_label"],
    {
      name: "dev_reviews_player_quarter_idx",
    },
  );
  await queryInterface.addIndex("development_reviews", ["status"], {
    name: "dev_reviews_status_idx",
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("development_reviews");
}
