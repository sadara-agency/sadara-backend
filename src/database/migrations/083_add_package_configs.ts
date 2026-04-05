import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS package_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      package VARCHAR(10) NOT NULL,
      module VARCHAR(100) NOT NULL,
      can_create BOOLEAN NOT NULL DEFAULT false,
      can_read BOOLEAN NOT NULL DEFAULT false,
      can_update BOOLEAN NOT NULL DEFAULT false,
      can_delete BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_package_configs_package_module UNIQUE (package, module)
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_package_configs_package
    ON package_configs (package);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS package_configs;`);
}
