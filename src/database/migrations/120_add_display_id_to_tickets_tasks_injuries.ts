import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.addColumn("tickets", "display_id", {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  });

  await queryInterface.addColumn("tasks", "display_id", {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  });

  await queryInterface.addColumn("injuries", "display_id", {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.removeColumn("tickets", "display_id");
  await queryInterface.removeColumn("tasks", "display_id");
  await queryInterface.removeColumn("injuries", "display_id");
}
