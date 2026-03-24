import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role VARCHAR(50) NOT NULL,
      module VARCHAR(100) NOT NULL,
      can_create BOOLEAN NOT NULL DEFAULT false,
      can_read BOOLEAN NOT NULL DEFAULT false,
      can_update BOOLEAN NOT NULL DEFAULT false,
      can_delete BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_role_module UNIQUE (role, module)
    );
  `);

  // Ensure unique constraint exists even if table was pre-created by model.sync()
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_role_module'
      ) THEN
        ALTER TABLE role_permissions ADD CONSTRAINT uq_role_module UNIQUE (role, module);
      END IF;
    END $$;
  `);

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role)`,
  );
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS role_permissions CASCADE`);
}
