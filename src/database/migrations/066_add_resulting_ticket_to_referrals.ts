import { sequelize } from "@config/database";

/**
 * Migration 066: Add resulting_ticket_id to referrals
 *
 * Links a referral (performance session) to its resulting recommendation ticket.
 */

export async function up() {
  await sequelize.query(`
    ALTER TABLE referrals
    ADD COLUMN IF NOT EXISTS resulting_ticket_id UUID
      REFERENCES tickets(id) ON DELETE SET NULL;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_referrals_resulting_ticket
      ON referrals(resulting_ticket_id);
  `);
}

export async function down() {
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_referrals_resulting_ticket;
  `);
  await sequelize.query(`
    ALTER TABLE referrals DROP COLUMN IF EXISTS resulting_ticket_id;
  `);
}
