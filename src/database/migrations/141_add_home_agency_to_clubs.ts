import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sq = queryInterface.sequelize;

  // Fresh-DB guard: clubs table must already exist
  const [rows] = await sq.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'clubs' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sq.query(
    `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS is_home_agency BOOLEAN NOT NULL DEFAULT false;`,
  );

  // Partial unique index: at most one row may have is_home_agency = true
  await sq.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS clubs_is_home_agency_unique
       ON clubs (is_home_agency) WHERE is_home_agency = true;`,
  );

  // Idempotent seed: only insert if no home-agency row exists yet
  await sq.query(
    `INSERT INTO clubs (id, name, name_ar, type, country, is_home_agency, is_active, created_at, updated_at)
       SELECT gen_random_uuid(), 'Sadara Sports Agency', $$وكالة صدارة الرياضية$$,
              'Club', 'Saudi Arabia', true, true, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE is_home_agency = true);`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sq = queryInterface.sequelize;
  await sq.query(`DROP INDEX IF EXISTS clubs_is_home_agency_unique;`);
  // Do not delete the seeded row on down — only drop the column
  await sq.query(`ALTER TABLE clubs DROP COLUMN IF EXISTS is_home_agency;`);
}
