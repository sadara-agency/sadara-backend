import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn("player_match_stats", "shot_map", {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn("player_match_stats", "shot_map");
}
