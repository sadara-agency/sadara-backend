import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

/**
 * Adds lifecycle metadata to `player_coach_assignments` so an assignment
 * can move through Assigned → Acknowledged → InProgress → Completed,
 * carry a priority, an optional due-by date, and free-form notes.
 *
 * Before this migration the table was a pure join (player ↔ staff ↔ specialty)
 * with no signal that the assigned user was even aware of the assignment.
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await addColumnIfMissing(
    queryInterface,
    "player_coach_assignments",
    "status",
    {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Assigned",
    },
  );
  await addColumnIfMissing(
    queryInterface,
    "player_coach_assignments",
    "priority",
    {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "normal",
    },
  );
  await addColumnIfMissing(
    queryInterface,
    "player_coach_assignments",
    "due_at",
    {
      type: DataTypes.DATE,
      allowNull: true,
    },
  );
  await addColumnIfMissing(
    queryInterface,
    "player_coach_assignments",
    "acknowledged_at",
    {
      type: DataTypes.DATE,
      allowNull: true,
    },
  );
  await addColumnIfMissing(
    queryInterface,
    "player_coach_assignments",
    "completed_at",
    {
      type: DataTypes.DATE,
      allowNull: true,
    },
  );
  await addColumnIfMissing(
    queryInterface,
    "player_coach_assignments",
    "notes",
    {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  );

  // Index on (coach_user_id, status) — primary read path is "my assignments
  // filtered by status" from the dashboard widget.
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_pca_coach_status
     ON player_coach_assignments(coach_user_id, status)`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_pca_coach_status`,
  );
  await removeColumnIfPresent(
    queryInterface,
    "player_coach_assignments",
    "notes",
  );
  await removeColumnIfPresent(
    queryInterface,
    "player_coach_assignments",
    "completed_at",
  );
  await removeColumnIfPresent(
    queryInterface,
    "player_coach_assignments",
    "acknowledged_at",
  );
  await removeColumnIfPresent(
    queryInterface,
    "player_coach_assignments",
    "due_at",
  );
  await removeColumnIfPresent(
    queryInterface,
    "player_coach_assignments",
    "priority",
  );
  await removeColumnIfPresent(
    queryInterface,
    "player_coach_assignments",
    "status",
  );
}
