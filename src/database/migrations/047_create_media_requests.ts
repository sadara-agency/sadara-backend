import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable("media_requests", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    journalist_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    journalist_name_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    outlet: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    outlet_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    journalist_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    journalist_phone: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    request_type: {
      type: DataTypes.ENUM(
        "interview",
        "press_conference",
        "photo_shoot",
        "statement",
        "other",
      ),
      allowNull: false,
      defaultValue: "interview",
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    subject_ar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    club_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "clubs", key: "id" },
      onDelete: "SET NULL",
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "matches", key: "id" },
      onDelete: "SET NULL",
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "scheduled",
        "completed",
        "declined",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    priority: {
      type: DataTypes.ENUM("low", "normal", "high", "urgent"),
      allowNull: false,
      defaultValue: "normal",
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    calendar_event_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    decline_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex("media_requests", ["status"]);
  await queryInterface.addIndex("media_requests", ["player_id"]);
  await queryInterface.addIndex("media_requests", ["created_by"]);
  await queryInterface.addIndex("media_requests", ["deadline"]);
  await queryInterface.addIndex("media_requests", ["assigned_to"]);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("media_requests");
}
