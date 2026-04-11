import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  // ── mental_assessment_templates ──
  await queryInterface.createTable("mental_assessment_templates", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    name_ar: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "custom",
      comment: "depression | anxiety | stress | burnout | wellbeing | custom",
    },
    questions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment:
        "Array of {text, textAr, type: scale|boolean|text, min, max, weight}",
    },
    scoring_ranges: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment:
        "Array of {minScore, maxScore, label, labelAr, severity: normal|mild|moderate|severe}",
    },
    max_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_validated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

  await queryInterface.addIndex("mental_assessment_templates", ["category"], {
    name: "mental_templates_category_idx",
  });
  await queryInterface.addIndex("mental_assessment_templates", ["is_active"], {
    name: "mental_templates_active_idx",
  });

  // ── mental_assessments ──
  await queryInterface.createTable("mental_assessments", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    template_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "mental_assessment_templates", key: "id" },
      onDelete: "RESTRICT",
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    administered_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    assessment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    responses: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: "Array of {questionIndex, value}",
    },
    total_score: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    severity_level: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: "normal | mild | moderate | severe",
    },
    clinical_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    clinical_notes_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recommended_actions: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    follow_up_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_confidential: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "completed",
      comment: "pending | completed | reviewed",
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex(
    "mental_assessments",
    ["player_id", "assessment_date"],
    {
      name: "mental_assessments_player_date_idx",
    },
  );
  await queryInterface.addIndex("mental_assessments", ["is_confidential"], {
    name: "mental_assessments_confidential_idx",
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("mental_assessments");
  await queryInterface.dropTable("mental_assessment_templates");
}
