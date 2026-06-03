import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("profile_change_requests", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: { type: DataTypes.UUID, allowNull: false },
    requested_by: { type: DataTypes.UUID, allowNull: false },
    changes: { type: DataTypes.JSONB, allowNull: false },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Pending",
    },
    approval_request_id: { type: DataTypes.UUID, allowNull: true },
    resolved_by: { type: DataTypes.UUID, allowNull: true },
    resolved_at: { type: DataTypes.DATE, allowNull: true },
    reviewer_comment: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("profile_change_requests");
}
