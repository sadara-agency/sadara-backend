import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Guard: skip on fresh-DB CI runs where players table doesn't exist yet
  if (!(await tableExists(queryInterface, "players"))) return;

  await queryInterface.createTable("player_season_stats", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    season: { type: DataTypes.STRING(10), allowNull: false },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "manual",
    },
    matches_played: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    minutes_played: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    goals: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    assists: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    yellow_cards: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    red_cards: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    pass_completion_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    distance_covered: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    clean_sheets: { type: DataTypes.INTEGER, allowNull: true },
    saves_made: { type: DataTypes.INTEGER, allowNull: true },
    save_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    penalties_saved: { type: DataTypes.INTEGER, allowNull: true },
    goals_conceded: { type: DataTypes.INTEGER, allowNull: true },
    accurate_long_balls: { type: DataTypes.INTEGER, allowNull: true },
    clearances: { type: DataTypes.INTEGER, allowNull: true },
    tackles_made: { type: DataTypes.INTEGER, allowNull: true },
    tackle_success_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    interceptions: { type: DataTypes.INTEGER, allowNull: true },
    aerial_duels_won: { type: DataTypes.INTEGER, allowNull: true },
    blocks: { type: DataTypes.INTEGER, allowNull: true },
    recoveries: { type: DataTypes.INTEGER, allowNull: true },
    total_touches: { type: DataTypes.INTEGER, allowNull: true },
    passing_accuracy: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    key_passes: { type: DataTypes.INTEGER, allowNull: true },
    chances_created: { type: DataTypes.INTEGER, allowNull: true },
    final_third_passes: { type: DataTypes.INTEGER, allowNull: true },
    progressive_carries: { type: DataTypes.INTEGER, allowNull: true },
    ball_recoveries: { type: DataTypes.INTEGER, allowNull: true },
    shots_on_target: { type: DataTypes.INTEGER, allowNull: true },
    shot_accuracy: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    big_chances_converted: { type: DataTypes.INTEGER, allowNull: true },
    big_chances_missed: { type: DataTypes.INTEGER, allowNull: true },
    successful_dribbles_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    xg: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    box_touches: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  if (await tableExists(queryInterface, "player_season_stats")) {
    await queryInterface.addIndex(
      "player_season_stats",
      ["player_id", "season"],
      {
        unique: true,
        name: "player_season_stats_player_id_season_unique",
      },
    );
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("player_season_stats");
}
