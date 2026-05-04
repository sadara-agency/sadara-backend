import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "wellness_exercises", "level", {
    type: DataTypes.STRING(20),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "wellness_exercises", "force", {
    type: DataTypes.STRING(20),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "wellness_exercises", "mechanic", {
    type: DataTypes.STRING(20),
    allowNull: true,
  });
  await addColumnIfMissing(
    queryInterface,
    "wellness_exercises",
    "primary_muscles",
    {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  );
  await addColumnIfMissing(
    queryInterface,
    "wellness_exercises",
    "secondary_muscles",
    {
      type: DataTypes.JSONB,
      allowNull: true,
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
    "wellness_exercises",
    "secondary_muscles",
  );
  await removeColumnIfPresent(
    queryInterface,
    "wellness_exercises",
    "primary_muscles",
  );
  await removeColumnIfPresent(queryInterface, "wellness_exercises", "mechanic");
  await removeColumnIfPresent(queryInterface, "wellness_exercises", "force");
  await removeColumnIfPresent(queryInterface, "wellness_exercises", "level");
}
