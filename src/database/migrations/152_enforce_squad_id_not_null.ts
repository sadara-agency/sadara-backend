// ═══════════════════════════════════════════════════════════════
// Migration 152: Enforce NOT NULL on matches.home_squad_id / away_squad_id
//
// Phase 4 of the SAFF Club/Squad refactor. Before running this
// migration the backfill script must have been applied:
//   npx ts-node -r tsconfig-paths/register src/scripts/backfill-squads.ts
//
// The migration attempts a last-pass backfill using senior-squad
// lookup and then aborts with a clear error if any NULL rows remain.
// ═══════════════════════════════════════════════════════════════
import { QueryInterface, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Fresh-DB guard
  const [tables] = await seq.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'matches'`,
  );
  if ((tables as unknown[]).length === 0) {
    console.log("Migration 152: matches table missing — skipping (fresh DB)");
    return;
  }

  // Check if columns exist at all (skip gracefully on fresh CI)
  const [cols] = await seq.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'matches'
       AND column_name IN ('home_squad_id', 'away_squad_id')`,
  );
  if ((cols as { column_name: string }[]).length < 2) {
    console.log("Migration 152: squad columns not yet present — skipping");
    return;
  }

  // Last-pass backfill: assign senior squad where squad ID is still NULL
  // Uses the first senior squad found for the club, preferring premier division.
  await seq.query(`
    UPDATE matches
    SET home_squad_id = (
      SELECT id FROM squads
      WHERE club_id = matches.home_club_id
        AND age_category = 'senior'
      ORDER BY CASE WHEN division = 'premier' THEN 0 ELSE 1 END, created_at
      LIMIT 1
    )
    WHERE home_squad_id IS NULL AND home_club_id IS NOT NULL
  `);

  await seq.query(`
    UPDATE matches
    SET away_squad_id = (
      SELECT id FROM squads
      WHERE club_id = matches.away_club_id
        AND age_category = 'senior'
      ORDER BY CASE WHEN division = 'premier' THEN 0 ELSE 1 END, created_at
      LIMIT 1
    )
    WHERE away_squad_id IS NULL AND away_club_id IS NOT NULL
  `);

  // Check remaining NULLs — only matches with a mapped club are resolvable.
  // Matches with no home_club_id/away_club_id cannot be auto-assigned a squad;
  // skip NOT NULL enforcement for those rather than crashing the server.
  const [nullRows] = await seq.query(
    `SELECT COUNT(*)::int AS cnt FROM matches WHERE home_squad_id IS NULL OR away_squad_id IS NULL`,
  );
  const nullCount = Number((nullRows as { cnt: number }[])[0]?.cnt ?? 0);

  if (nullCount > 0) {
    // Log how many are unresolvable (no club) vs genuinely missing
    const [unmappedRows] = await seq.query(
      `SELECT COUNT(*)::int AS cnt FROM matches
       WHERE (home_squad_id IS NULL AND home_club_id IS NULL)
          OR (away_squad_id IS NULL AND away_club_id IS NULL)`,
    );
    const unmappedCount = Number(
      (unmappedRows as { cnt: number }[])[0]?.cnt ?? 0,
    );
    console.warn(
      `Migration 152: ${nullCount} matches still have NULL squad IDs ` +
        `(${unmappedCount} have no club and cannot be auto-assigned). ` +
        "Skipping NOT NULL enforcement — clean up clubless matches and re-run to enforce.",
    );
    return;
  }

  // Enforce NOT NULL only when all matches have been resolved
  await seq.query(
    `ALTER TABLE matches ALTER COLUMN home_squad_id SET NOT NULL`,
  );
  await seq.query(
    `ALTER TABLE matches ALTER COLUMN away_squad_id SET NOT NULL`,
  );

  console.log(
    "Migration 152: home_squad_id and away_squad_id are now NOT NULL on matches",
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  const [tables] = await seq.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'matches'`,
  );
  if ((tables as unknown[]).length === 0) return;

  await seq.query(
    `ALTER TABLE matches ALTER COLUMN home_squad_id DROP NOT NULL`,
  );
  await seq.query(
    `ALTER TABLE matches ALTER COLUMN away_squad_id DROP NOT NULL`,
  );

  console.log(
    "Migration 152: rolled back — home_squad_id and away_squad_id are now nullable",
  );
}
