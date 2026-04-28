import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "players", "first_name_ar", {
    type: DataTypes.STRING(100),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "players", "last_name_ar", {
    type: DataTypes.STRING(100),
    allowNull: true,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(queryInterface, "players", "first_name_ar");
  await removeColumnIfPresent(queryInterface, "players", "last_name_ar");
}
