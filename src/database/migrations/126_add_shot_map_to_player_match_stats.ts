import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE player_match_stats
    ADD COLUMN IF NOT EXISTS shot_map JSONB NOT NULL DEFAULT '[]'
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE player_match_stats
    DROP COLUMN IF EXISTS shot_map
  `);
}
