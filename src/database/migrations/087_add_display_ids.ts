import { sequelize } from "@config/database";

/**
 * Migration 087: Add display_id columns to major entities and create
 * a sequence tracking table for generating human-readable IDs.
 *
 * Format: PREFIX-YY-NNNN (e.g. P-26-0001, CON-26-0042)
 * Clubs use a separate `code` column (3-letter abbreviation).
 */
export async function up() {
  // 1. Create sequence tracking table
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS display_id_sequences (
      entity   VARCHAR(20) NOT NULL,
      year     INT         NOT NULL,
      next_val INT         NOT NULL DEFAULT 1,
      PRIMARY KEY (entity, year)
    );
  `);

  // 2. Add display_id to entities
  const tables = [
    "players",
    "contracts",
    "offers",
    "matches",
    "referrals",
    "invoices",
    "sessions",
  ];

  for (const table of tables) {
    await sequelize.query(`
      ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS display_id VARCHAR(20) UNIQUE;
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_${table}_display_id
      ON ${table} (display_id) WHERE display_id IS NOT NULL;
    `);
  }

  // 3. Add code column to clubs
  await sequelize.query(`
    ALTER TABLE clubs
    ADD COLUMN IF NOT EXISTS code VARCHAR(10) UNIQUE;
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_clubs_code
    ON clubs (code) WHERE code IS NOT NULL;
  `);

  // 4. Backfill existing records with display IDs
  const prefixes: Record<string, string> = {
    players: "P",
    contracts: "CON",
    offers: "OFR",
    matches: "MTH",
    referrals: "TKT",
    invoices: "INV",
    sessions: "SES",
  };

  for (const [table, prefix] of Object.entries(prefixes)) {
    // Get all records ordered by creation date
    const [rows] = (await sequelize.query(`
      SELECT id, EXTRACT(YEAR FROM created_at)::int AS yr
      FROM ${table}
      WHERE display_id IS NULL
      ORDER BY created_at ASC;
    `)) as unknown as [Array<{ id: string; yr: number }>];

    if (rows.length === 0) continue;

    // Group by year and assign sequential IDs
    const yearCounters: Record<number, number> = {};
    const updates: Array<{ id: string; displayId: string }> = [];

    for (const row of rows) {
      const yr = row.yr % 100;
      if (!yearCounters[yr]) {
        yearCounters[yr] = 0;
      }
      yearCounters[yr]++;
      const seq = String(yearCounters[yr]).padStart(4, "0");
      updates.push({ id: row.id, displayId: `${prefix}-${yr}-${seq}` });
    }

    // Batch update
    for (const u of updates) {
      await sequelize.query(
        `UPDATE ${table} SET display_id = :displayId WHERE id = :id`,
        { replacements: { displayId: u.displayId, id: u.id } },
      );
    }

    // Update sequence table with the max counter per year
    for (const [yr, count] of Object.entries(yearCounters)) {
      await sequelize.query(
        `INSERT INTO display_id_sequences (entity, year, next_val)
         VALUES (:entity, :year, :nextVal)
         ON CONFLICT (entity, year) DO UPDATE SET next_val = :nextVal`,
        {
          replacements: {
            entity: table,
            year: Number(yr) + 2000,
            nextVal: count + 1,
          },
        },
      );
    }
  }
}

export async function down() {
  const tables = [
    "players",
    "contracts",
    "offers",
    "matches",
    "referrals",
    "invoices",
    "sessions",
  ];

  for (const table of tables) {
    await sequelize.query(
      `ALTER TABLE ${table} DROP COLUMN IF EXISTS display_id;`,
    );
  }

  await sequelize.query(`ALTER TABLE clubs DROP COLUMN IF EXISTS code;`);
  await sequelize.query(`DROP TABLE IF EXISTS display_id_sequences;`);
}
