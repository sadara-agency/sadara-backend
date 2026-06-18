import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("network_partners", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reference_no: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    name_en: { type: DataTypes.STRING(200), allowNull: false },
    name_ar: { type: DataTypes.STRING(200), allowNull: true },
    capacity: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    corridor: { type: DataTypes.STRING(100), allowNull: true },
    fifa_agent_id: { type: DataTypes.STRING(100), allowNull: true },
    contact_email: { type: DataTypes.STRING(255), allowNull: false },
    valid_from: { type: DataTypes.DATEONLY, allowNull: true },
    valid_through: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Active",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("network_partners");
}
