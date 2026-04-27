// ═══════════════════════════════════════════════════════════════
// Migration 176: injuries.player_id FK → ON DELETE RESTRICT
//
// Injury history must outlive accidental player deletion.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE injuries
        DROP CONSTRAINT IF EXISTS injuries_player_id_fkey;
      ALTER TABLE injuries
        ADD CONSTRAINT injuries_player_id_fkey
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE RESTRICT;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE injuries
        DROP CONSTRAINT IF EXISTS injuries_player_id_fkey;
      ALTER TABLE injuries
        ADD CONSTRAINT injuries_player_id_fkey
          FOREIGN KEY (player_id) REFERENCES players(id);
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
