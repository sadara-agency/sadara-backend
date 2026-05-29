import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";

/**
 * Migration 246: Add display_id column to users table.
 *
 * Format: U-YY-NNNN (e.g. U-26-0001)
 * Backfills existing users ordered by created_at.
 */
export async function up() {
  const tableCheck = await sequelize.query<{ "?column?": number }>(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'`,
    { type: QueryTypes.SELECT },
  );
  if (tableCheck.length === 0) return;

  await sequelize.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_id VARCHAR(20) UNIQUE;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_users_display_id
    ON users (display_id) WHERE display_id IS NOT NULL;
  `);

  // Backfill existing users
  const existingRows = await sequelize.query<{ id: string; yr: number }>(
    `SELECT id, EXTRACT(YEAR FROM created_at)::int AS yr
     FROM users
     WHERE display_id IS NULL
     ORDER BY created_at ASC`,
    { type: QueryTypes.SELECT },
  );

  if (existingRows.length === 0) return;

  // Ensure the sequence table exists. Migration 087 creates it, but its
  // fresh-DB guard skips creation when `players` was absent at the time it
  // ran, leaving the table missing even though 087 is recorded as executed.
  // Create it defensively so this migration is self-sufficient and idempotent.
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS display_id_sequences (
      entity   VARCHAR(20) NOT NULL,
      year     INT         NOT NULL,
      next_val INT         NOT NULL DEFAULT 1,
      PRIMARY KEY (entity, year)
    );
  `);

  const yearCounters: Record<number, number> = {};
  const updates: Array<{ id: string; displayId: string }> = [];

  for (const row of existingRows) {
    const yr = row.yr % 100;
    if (!yearCounters[yr]) yearCounters[yr] = 0;
    yearCounters[yr]++;
    const seq = String(yearCounters[yr]).padStart(4, "0");
    updates.push({ id: row.id, displayId: `U-${yr}-${seq}` });
  }

  for (const u of updates) {
    await sequelize.query(
      `UPDATE users SET display_id = :displayId WHERE id = :id`,
      { replacements: { displayId: u.displayId, id: u.id } },
    );
  }

  for (const [yr, count] of Object.entries(yearCounters)) {
    await sequelize.query(
      `INSERT INTO display_id_sequences (entity, year, next_val)
       VALUES (:entity, :year, :nextVal)
       ON CONFLICT (entity, year) DO UPDATE SET next_val = :nextVal`,
      {
        replacements: {
          entity: "users",
          year: Number(yr) + 2000,
          nextVal: count + 1,
        },
      },
    );
  }
}

export async function down() {
  const tableCheck = await sequelize.query<{ "?column?": number }>(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'`,
    { type: QueryTypes.SELECT },
  );
  if (tableCheck.length === 0) return;

  await sequelize.query(`DROP INDEX IF EXISTS idx_users_display_id;`);
  await sequelize.query(`ALTER TABLE users DROP COLUMN IF EXISTS display_id;`);
  await sequelize.query(
    `DELETE FROM display_id_sequences WHERE entity = 'users';`,
  );
}
