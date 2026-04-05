import { sequelize } from "@config/database";

export async function up() {
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
  await sequelize.query(`
    DROP INDEX IF EXISTS sessions_resulting_ticket_id_idx;
  `);

  await sequelize.query(`
    ALTER TABLE sessions
    DROP COLUMN IF EXISTS resulting_ticket_id;
  `);
}
