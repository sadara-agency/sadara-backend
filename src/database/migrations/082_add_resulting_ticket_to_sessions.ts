import { sequelize } from "@config/database";

export async function up() {
  const [guard] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets' AND table_schema = 'public'`,
  );
  if ((guard as unknown[]).length === 0) return;

  const [r] = await sequelize.query(
    `SELECT to_regclass('public.sessions') AS tbl`,
  );
  if (!(r as Array<{ tbl: string | null }>)[0]?.tbl) return;

  await sequelize.query(`
    ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS resulting_ticket_id UUID
      REFERENCES tickets(id) ON UPDATE CASCADE ON DELETE SET NULL;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS sessions_resulting_ticket_id_idx
    ON sessions (resulting_ticket_id);
  `);
}

export async function down() {
  const [r] = await sequelize.query(
    `SELECT to_regclass('public.sessions') AS tbl`,
  );
  if (!(r as Array<{ tbl: string | null }>)[0]?.tbl) return;

  await sequelize.query(`
    DROP INDEX IF EXISTS sessions_resulting_ticket_id_idx;
  `);

  await sequelize.query(`
    ALTER TABLE sessions
    DROP COLUMN IF EXISTS resulting_ticket_id;
  `);
}
