// ═══════════════════════════════════════════════════════════════
// Migration 179: offers.player_id FK → ON DELETE CASCADE
//
// Offers are ephemeral negotiation artefacts attached to a player.
// When a player is hard-deleted (which deletePlayer() now blocks while
// contracts/referrals/injuries exist), any leftover offers should drop
// with them — they have no standalone value.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE offers
        DROP CONSTRAINT IF EXISTS offers_player_id_fkey;
      ALTER TABLE offers
        ADD CONSTRAINT offers_player_id_fkey
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE offers
        DROP CONSTRAINT IF EXISTS offers_player_id_fkey;
      ALTER TABLE offers
        ADD CONSTRAINT offers_player_id_fkey
          FOREIGN KEY (player_id) REFERENCES players(id);
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
