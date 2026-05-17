import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("hydration_logs", {
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
    amount_ml: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    logged_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex(
    "hydration_logs",
    ["player_id", "logged_date"],
    {
      name: "idx_hydration_logs_player_date",
    },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("hydration_logs");
}
