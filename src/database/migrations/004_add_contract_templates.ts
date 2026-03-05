import { sequelize } from "../../config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS contract_templates (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name            VARCHAR(200) NOT NULL,
      name_ar         VARCHAR(200),
      contract_type   VARCHAR(50) NOT NULL,
      category        VARCHAR(20) NOT NULL,
      default_values  JSONB NOT NULL DEFAULT '{}',
      is_active       BOOLEAN NOT NULL DEFAULT true,
      created_by      UUID,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_contract_templates_type
      ON contract_templates(contract_type);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_contract_templates_active
      ON contract_templates(is_active);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS contract_templates CASCADE`);
}
