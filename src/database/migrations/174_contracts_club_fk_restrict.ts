// ═══════════════════════════════════════════════════════════════
// Migration 174: contracts.club_id FK → ON DELETE RESTRICT
//
// Mirrors migration 035 (which did the same for contracts.player_id).
// Prevents silent orphaning of contracts when a club is deleted.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE contracts
        DROP CONSTRAINT IF EXISTS contracts_club_id_fkey;
      ALTER TABLE contracts
        ADD CONSTRAINT contracts_club_id_fkey
          FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE RESTRICT;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE contracts
        DROP CONSTRAINT IF EXISTS contracts_club_id_fkey;
      ALTER TABLE contracts
        ADD CONSTRAINT contracts_club_id_fkey
          FOREIGN KEY (club_id) REFERENCES clubs(id);
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
