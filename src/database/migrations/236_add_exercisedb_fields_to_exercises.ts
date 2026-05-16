import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // photo_url was defined in the model but never migrated (202 was skipped)
  await addColumnIfMissing(queryInterface, "wellness_exercises", "photo_url", {
    type: DataTypes.STRING(500),
    allowNull: true,
  });
  await addColumnIfMissing(
    queryInterface,
    "wellness_exercises",
    "external_db_id",
    {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
  );
  await addColumnIfMissing(queryInterface, "wellness_exercises", "gif_url", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(queryInterface, "wellness_exercises", "gif_url");
  await removeColumnIfPresent(
    queryInterface,
    "wellness_exercises",
    "external_db_id",
  );
  await removeColumnIfPresent(
    queryInterface,
    "wellness_exercises",
    "photo_url",
  );
}
