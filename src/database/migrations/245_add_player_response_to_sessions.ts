import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

// Adds player-authored response columns to sessions so the player portal can be
// a two-way development loop: the player confirms/declines attendance and writes
// their own notes. player_notes are surfaced to Admin only (privacy boundary —
// the responsible staff and managers do not see them).

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "sessions", "player_attendance", {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: "Pending",
  });
  await addColumnIfMissing(queryInterface, "sessions", "player_notes", {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "sessions", "player_responded_at", {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(
    queryInterface,
    "sessions",
    "player_responded_at",
  );
  await removeColumnIfPresent(queryInterface, "sessions", "player_notes");
  await removeColumnIfPresent(queryInterface, "sessions", "player_attendance");
}
