// ═══════════════════════════════════════════════════════════════
// Migration 035: Change contracts.player_id FK from CASCADE to RESTRICT
//
// Prevents accidental deletion of players who have contracts.
// Previously, deleting a player would silently cascade-delete
// all their contracts, causing 404s in the UI.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    ALTER TABLE contracts
      DROP CONSTRAINT IF EXISTS contracts_player_id_fkey,
      ADD CONSTRAINT contracts_player_id_fkey
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE RESTRICT;
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE contracts
      DROP CONSTRAINT IF EXISTS contracts_player_id_fkey,
      ADD CONSTRAINT contracts_player_id_fkey
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
  `);
}
