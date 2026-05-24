import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

// Adds advanced per-match metrics to player_match_stats so the analyst
// Performance Matrix can surface xG, xA, and progressive passes alongside
// the existing per-match rating. Season-level player_season_stats already
// carries xg / progressive_carries; these mirror that at the match level.

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "player_match_stats", "xg", {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "player_match_stats", "xa", {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(
    queryInterface,
    "player_match_stats",
    "progressive_passes",
    {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    "player_match_stats",
    "progressive_passes",
  );
  await removeColumnIfPresent(queryInterface, "player_match_stats", "xa");
  await removeColumnIfPresent(queryInterface, "player_match_stats", "xg");
}
