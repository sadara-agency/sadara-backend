import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "sessions", "location_type", {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "sessions", "location_url", {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(queryInterface, "sessions", "location_url");
  await removeColumnIfPresent(queryInterface, "sessions", "location_type");
}
