import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_match_stats' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
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
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_match_stats' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await queryInterface.sequelize.query(`
    ALTER TABLE player_match_stats
    DROP COLUMN IF EXISTS shot_map
  `);
}
