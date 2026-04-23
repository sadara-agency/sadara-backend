import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'clubs' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await queryInterface.sequelize.query(`
    ALTER TABLE clubs
    ADD COLUMN IF NOT EXISTS saff_team_id INTEGER
  `);
  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS clubs_saff_team_id_key
    ON clubs (saff_team_id) WHERE saff_team_id IS NOT NULL
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'clubs' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await queryInterface.sequelize.query(`
    DROP INDEX IF EXISTS clubs_saff_team_id_key
  `);
  await queryInterface.sequelize.query(`
    ALTER TABLE clubs DROP COLUMN IF EXISTS saff_team_id
  `);
}
