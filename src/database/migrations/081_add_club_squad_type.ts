import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'clubs' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    ALTER TABLE clubs
    ADD COLUMN IF NOT EXISTS squad_type VARCHAR(20) DEFAULT 'Senior';
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'clubs' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    ALTER TABLE clubs
    DROP COLUMN IF EXISTS squad_type;
  `);
}
