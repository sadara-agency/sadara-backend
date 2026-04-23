import { sequelize } from "@config/database";

export async function up() {
  const [r] = await sequelize.query(
    `SELECT to_regclass('public.player_journeys') AS tbl`,
  );
  if (!(r as Array<{ tbl: string | null }>)[0]?.tbl) return;

  // Task 5: Add referral_id to player_journeys
  await sequelize.query(`
    ALTER TABLE player_journeys
    ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL;
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_journeys_referral_id ON player_journeys (referral_id);
  `);

  // Task 6: Add journey_stage_id to sessions
  await sequelize.query(`
    ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS journey_stage_id UUID REFERENCES player_journeys(id) ON DELETE SET NULL;
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_journey_stage ON sessions (journey_stage_id);
  `);
}

export async function down() {
  const [r] = await sequelize.query(
    `SELECT to_regclass('public.player_journeys') AS tbl`,
  );
  if (!(r as Array<{ tbl: string | null }>)[0]?.tbl) return;

  await sequelize.query(`
    ALTER TABLE sessions DROP COLUMN IF EXISTS journey_stage_id;
  `);
  await sequelize.query(`
    ALTER TABLE player_journeys DROP COLUMN IF EXISTS referral_id;
  `);
}
