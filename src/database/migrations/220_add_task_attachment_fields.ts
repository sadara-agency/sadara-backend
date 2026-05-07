import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "tasks", "requires_attachment", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
  await addColumnIfMissing(queryInterface, "tasks", "justification_text", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(queryInterface, "tasks", "justification_text");
  await removeColumnIfPresent(queryInterface, "tasks", "requires_attachment");
}
