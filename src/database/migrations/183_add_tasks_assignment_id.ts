import { QueryInterface, DataTypes } from "sequelize";
import {
  addColumnIfMissing,
  removeColumnIfPresent,
  tableExists,
} from "../migrationHelpers";

/**
 * Links auto-generated tasks back to the assignment that spawned them so
 * the player detail "What's expected from me" banner can render the open
 * tasks for the current viewer's assignment in O(1).
 *
 * `assignment_id` is nullable — most tasks predate this column and are not
 * tied to a working-group assignment.
 *
 * SET NULL on delete: if an assignment is removed we keep historic tasks
 * but unlink them; deleting a task that the assignment "spawned" is harmless.
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  if (!(await tableExists(queryInterface, "tasks"))) return;

  await addColumnIfMissing(queryInterface, "tasks", "assignment_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "player_coach_assignments", key: "id" },
    onDelete: "SET NULL",
  });

  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_tasks_assignment_id
     ON tasks(assignment_id) WHERE assignment_id IS NOT NULL`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_tasks_assignment_id`,
  );
  await removeColumnIfPresent(queryInterface, "tasks", "assignment_id");
}
