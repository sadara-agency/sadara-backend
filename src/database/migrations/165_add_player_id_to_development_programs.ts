import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(
    queryInterface,
    "development_programs",
    "player_id",
    {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(
    queryInterface,
    "development_programs",
    "player_id",
  );
}
