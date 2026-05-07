import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "tasks", "source_decision_id", {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
  });
  await queryInterface
    .addIndex("tasks", ["source_decision_id"], {
      name: "idx_tasks_source_decision_id",
    })
    .catch(() => void 0);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface
    .removeIndex("tasks", "idx_tasks_source_decision_id")
    .catch(() => void 0);
  await removeColumnIfPresent(queryInterface, "tasks", "source_decision_id");
}
