import { QueryInterface } from "sequelize";

/**
 * Create the `packages` table — stores tier metadata (A/B/C names, descriptions).
 * The tier code is referenced by `players.player_package` (VARCHAR).
 * Seed three rows for A (Premium), B (Standard), C (Basic).
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      code        VARCHAR(10) NOT NULL UNIQUE,
      name        VARCHAR(100) NOT NULL,
      name_ar     VARCHAR(100),
      description TEXT,
      is_active   BOOLEAN     NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await queryInterface.sequelize.query(`
    INSERT INTO packages (id, code, name, name_ar, description, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), 'A', 'Premium',  'بريميوم', 'Full platform access including all modules and features', true, now(), now()),
      (gen_random_uuid(), 'B', 'Standard', 'ستاندرد', 'Core features plus specialist development modules',       true, now(), now()),
      (gen_random_uuid(), 'C', 'Basic',    'أساسي',   'Essential player management and communication features',  true, now(), now())
    ON CONFLICT (code) DO NOTHING;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS packages;`);
}
