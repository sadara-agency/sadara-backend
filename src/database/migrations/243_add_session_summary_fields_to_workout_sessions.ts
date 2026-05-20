import { QueryInterface, DataTypes } from "sequelize";
import {
  addColumnIfMissing,
  removeColumnIfPresent,
  tableExists,
  indexExists,
} from "../migrationHelpers";

// Adds day-level summary fields to workout_sessions so the player tracker can
// persist a completed session's duration and an optional note, and adds a
// unique constraint on (plan_id, plan_day_id, scheduled_date) so the
// materialize-on-interaction findOrCreate is race-safe.

const CONSTRAINT = "workout_sessions_plan_day_date_uniq";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "workout_sessions", "duration_min", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "workout_sessions", "player_notes", {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  if (
    (await tableExists(queryInterface, "workout_sessions")) &&
    !(await indexExists(queryInterface, CONSTRAINT))
  ) {
    await queryInterface.addConstraint("workout_sessions", {
      fields: ["plan_id", "plan_day_id", "scheduled_date"],
      type: "unique",
      name: CONSTRAINT,
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (
    (await tableExists(queryInterface, "workout_sessions")) &&
    (await indexExists(queryInterface, CONSTRAINT))
  ) {
    await queryInterface.removeConstraint("workout_sessions", CONSTRAINT);
  }
  await removeColumnIfPresent(
    queryInterface,
    "workout_sessions",
    "player_notes",
  );
  await removeColumnIfPresent(
    queryInterface,
    "workout_sessions",
    "duration_min",
  );
}
