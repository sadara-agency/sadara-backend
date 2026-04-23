import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_journeys' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  const [gatesRows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'gates' AND table_schema = 'public'`,
  );
  if ((gatesRows as unknown[]).length === 0) return;

  await sequelize.query(`
    ALTER TABLE player_journeys
    ADD COLUMN IF NOT EXISTS gate_id UUID
    REFERENCES gates(id) ON UPDATE CASCADE ON DELETE SET NULL;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS player_journeys_gate_id_idx
    ON player_journeys (gate_id);
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_journeys' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    DROP INDEX IF EXISTS player_journeys_gate_id_idx;
  `);
  await sequelize.query(`
    ALTER TABLE player_journeys DROP COLUMN IF EXISTS gate_id;
  `);
}
