import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(
    queryInterface,
    "competitions",
    "pulse_live_comp_id",
    {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
      defaultValue: null,
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
    "competitions",
    "pulse_live_comp_id",
  );
}
