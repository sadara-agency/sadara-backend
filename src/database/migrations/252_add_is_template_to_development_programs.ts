import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

// Adds an is_template flag to development_programs so a coach's reusable
// programs (player_id = null, is_template = true, scoped to their createdBy)
// can be cloned onto a player. Powers the simplified "template-first"
// program-creation flow. Defaults false so all existing rows stay normal
// player/cycle programs.

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(
    queryInterface,
    "development_programs",
    "is_template",
    {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    "is_template",
  );
}
