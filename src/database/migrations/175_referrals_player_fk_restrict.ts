// ═══════════════════════════════════════════════════════════════
// Migration 175: referrals.player_id FK → ON DELETE RESTRICT
//
// Medical case history must outlive accidental player deletion.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE referrals
        DROP CONSTRAINT IF EXISTS referrals_player_id_fkey;
      ALTER TABLE referrals
        ADD CONSTRAINT referrals_player_id_fkey
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE RESTRICT;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE referrals
        DROP CONSTRAINT IF EXISTS referrals_player_id_fkey;
      ALTER TABLE referrals
        ADD CONSTRAINT referrals_player_id_fkey
          FOREIGN KEY (player_id) REFERENCES players(id);
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
