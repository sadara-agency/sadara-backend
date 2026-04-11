import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  // ── training_plans ──
  await queryInterface.createTable("training_plans", {
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    title_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    position: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    period_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "in-season",
      comment: "pre-season | in-season | off-season | rehab",
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    weekly_hours: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true,
    },
    goals: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
      comment: "draft | active | completed | archived",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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

  await queryInterface.addIndex("training_plans", ["player_id"], {
    name: "training_plans_player_id_idx",
  });
  await queryInterface.addIndex("training_plans", ["status"], {
    name: "training_plans_status_idx",
  });

  // ── training_plan_weeks ──
  await queryInterface.createTable("training_plan_weeks", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "training_plans", key: "id" },
      onDelete: "CASCADE",
    },
    week_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    theme: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    theme_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    intensity: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "moderate",
      comment: "low | moderate | high | peak | recovery",
    },
    workout_template_ids: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      defaultValue: [],
    },
    session_ids: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      defaultValue: [],
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex(
    "training_plan_weeks",
    ["plan_id", "week_number"],
    {
      unique: true,
      name: "training_plan_weeks_plan_week_uniq",
    },
  );

  // ── training_plan_progress ──
  await queryInterface.createTable("training_plan_progress", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "training_plans", key: "id" },
      onDelete: "CASCADE",
    },
    week_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    completion_pct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    coach_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    player_feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    adjustments_made: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    logged_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
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
    "training_plan_progress",
    ["plan_id", "week_number"],
    {
      name: "training_plan_progress_plan_week_idx",
    },
  );
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("training_plan_progress");
  await queryInterface.dropTable("training_plan_weeks");
  await queryInterface.dropTable("training_plans");
}
