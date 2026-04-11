import { QueryInterface, DataTypes } from "sequelize";

export async function up({ context: qi }: { context: QueryInterface }) {
  await qi.createTable("session_feedback", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "sessions", key: "id" },
      onDelete: "CASCADE",
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    coach_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    technical_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tactical_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    physical_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mental_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    overall_rating: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
    },
    effort_level: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    attitude_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    strengths: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    strengths_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    areas_to_improve: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    areas_to_improve_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    coach_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    coach_notes_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metrics: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
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

  await qi.addIndex("session_feedback", ["session_id", "coach_id"], {
    unique: true,
    name: "session_feedback_session_coach_unique",
  });
  await qi.addIndex("session_feedback", ["player_id"]);
  await qi.addIndex("session_feedback", ["session_id"]);
}

export async function down({ context: qi }: { context: QueryInterface }) {
  await qi.dropTable("session_feedback");
}
