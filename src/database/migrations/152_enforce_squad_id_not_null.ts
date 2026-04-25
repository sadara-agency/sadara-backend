// ═══════════════════════════════════════════════════════════════
// Migration 152: Require squad_id whenever club_id is set on matches
//
// Phase 4 of the SAFF Club/Squad refactor. Originally enforced
// `NOT NULL` on matches.home_squad_id / away_squad_id, but that
// constraint can't accommodate legitimate orphan matches (rows with
// NULL home_club_id or away_club_id, e.g. scraped fixtures from
// before club mapping was hardened) AND a hard NOT NULL means a
// stranded production deploy when 1+ such rows exist.
//
// Revised approach: use a CHECK constraint
//   "(home_club_id IS NULL OR home_squad_id IS NOT NULL) AND
//    (away_club_id IS NULL OR away_squad_id IS NOT NULL)"
// which enforces the same rule for meaningful rows (every match
// with a club must have a squad) while permitting orphan matches
// with NULL club_id.
//
// To make the constraint satisfiable, we also auto-create senior
// squads for any clubs referenced by NULL-squad matches that don't
// yet have one — including inactive clubs, which the original
// backfill script (`scripts/backfill-squads.ts`) skipped.
// ═══════════════════════════════════════════════════════════════
import { QueryInterface, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Fresh-DB guard via describeTable
  let columns: Record<string, unknown>;
  try {
    columns = (await queryInterface.describeTable("matches")) as Record<
      string,
      unknown
    >;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("does not exist") ||
      msg.includes("No description found")
    ) {
      console.log("Migration 152: matches missing — skipping (fresh DB guard)");
      return;
    }
    throw err;
  }

  if (!("home_squad_id" in columns) || !("away_squad_id" in columns)) {
    console.log(
      "Migration 152: squad columns not yet present — skipping (fresh DB)",
    );
    return;
  }

  // ── 1. Auto-create senior squads for clubs referenced by NULL-squad matches ──
  // The backfill script `scripts/backfill-squads.ts` only created squads for
  // `is_active = true` clubs. Matches whose home/away club is inactive ended
  // up stranded. This pass closes that gap by creating a senior/premier squad
  // for ANY club referenced by a stranded match, regardless of is_active.
  await seq.query(`
    INSERT INTO squads
      (id, club_id, age_category, division, display_name, display_name_ar,
       is_active, created_at, updated_at)
    SELECT
      gen_random_uuid(), c.id, 'senior', 'premier',
      c.name, COALESCE(c.name_ar, c.name),
      true, NOW(), NOW()
    FROM clubs c
    WHERE c.id IN (
      SELECT DISTINCT home_club_id FROM matches
        WHERE home_squad_id IS NULL AND home_club_id IS NOT NULL
      UNION
      SELECT DISTINCT away_club_id FROM matches
        WHERE away_squad_id IS NULL AND away_club_id IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM squads s
      WHERE s.club_id = c.id AND s.age_category = 'senior'
    )
  `);

  // ── 2. Last-pass backfill: assign senior squad to remaining NULL rows ──
  // Prefers division='premier' but accepts any senior squad as a fallback.
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

  // ── 3. Heal dangling FK refs ──
  // If a match's home_club_id / away_club_id points to a club that no longer
  // exists in the `clubs` table, the squad-auto-create above couldn't help
  // because its FROM clause joined on clubs. Null out those dangling refs
  // (matching what an ON DELETE SET NULL constraint would have done) so the
  // CHECK constraint we add below accepts the row as a legitimate orphan.
  //
  // Hard-cap at 50 so a genuinely catastrophic dataset surfaces as a hard
  // failure rather than silent mass-mutation.
  const [danglingRows] = (await seq.query(`
    SELECT COUNT(*)::int AS cnt
    FROM matches m
    WHERE
      (m.home_squad_id IS NULL AND m.home_club_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM clubs c WHERE c.id = m.home_club_id))
      OR
      (m.away_squad_id IS NULL AND m.away_club_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM clubs c WHERE c.id = m.away_club_id))
  `)) as [Array<{ cnt: number }>, unknown];
  const danglingCount = Number(
    Array.isArray(danglingRows)
      ? (danglingRows[0]?.cnt ?? 0)
      : ((danglingRows as { cnt: number } | undefined)?.cnt ?? 0),
  );

  if (danglingCount > 50) {
    throw new Error(
      `Migration 152 aborted: ${danglingCount} matches with dangling club references — too many to auto-heal. ` +
        "Investigate the clubs table for missing rows before re-running.",
    );
  }

  if (danglingCount > 0) {
    console.log(
      `Migration 152: healing ${danglingCount} match(es) with dangling club references — nulling orphan club ids`,
    );
    await seq.query(`
      UPDATE matches m
      SET home_club_id = NULL
      WHERE m.home_squad_id IS NULL
        AND m.home_club_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM clubs c WHERE c.id = m.home_club_id)
    `);
    await seq.query(`
      UPDATE matches m
      SET away_club_id = NULL
      WHERE m.away_squad_id IS NULL
        AND m.away_club_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM clubs c WHERE c.id = m.away_club_id)
    `);
  }

  // ── 4. Sanity check: anything still NULL must be an orphan (NULL club_id) ──
  // The CHECK constraint we're about to add tolerates orphans, but if there
  // are stranded rows where club IS set yet squad is still NULL, something
  // unexpected is happening — fail loudly with a count for diagnostics.
  const [strandedRows] = (await seq.query(`
    SELECT COUNT(*)::int AS cnt
    FROM matches
    WHERE
      (home_squad_id IS NULL AND home_club_id IS NOT NULL)
      OR
      (away_squad_id IS NULL AND away_club_id IS NOT NULL)
  `)) as [Array<{ cnt: number }>, unknown];
  const strandedCount = Number(
    Array.isArray(strandedRows)
      ? (strandedRows[0]?.cnt ?? 0)
      : ((strandedRows as { cnt: number } | undefined)?.cnt ?? 0),
  );

  if (strandedCount > 0) {
    throw new Error(
      `Migration 152 aborted: ${strandedCount} matches still have a non-null club_id but no squad_id ` +
        "after squad auto-creation and dangling-ref healing. " +
        "This indicates a club exists but no senior squad could be created — investigate the clubs table.",
    );
  }

  // Diagnostic log: surface the orphan count so operators see the data shape.
  const [orphanRows] = (await seq.query(`
    SELECT COUNT(*)::int AS cnt
    FROM matches
    WHERE home_club_id IS NULL OR away_club_id IS NULL
  `)) as [Array<{ cnt: number }>, unknown];
  const orphanCount = Number(
    Array.isArray(orphanRows)
      ? (orphanRows[0]?.cnt ?? 0)
      : ((orphanRows as { cnt: number } | undefined)?.cnt ?? 0),
  );
  if (orphanCount > 0) {
    console.log(
      `Migration 152: ${orphanCount} orphan matches with NULL club_id retained — CHECK constraint permits these`,
    );
  }

  // ── 5. Add CHECK constraint (idempotent: drop first if it exists) ──
  await seq.query(
    `ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_squad_required_when_club`,
  );
  await seq.query(`
    ALTER TABLE matches
    ADD CONSTRAINT matches_squad_required_when_club CHECK (
      (home_club_id IS NULL OR home_squad_id IS NOT NULL) AND
      (away_club_id IS NULL OR away_squad_id IS NOT NULL)
    )
  `);

  console.log(
    "Migration 152: matches_squad_required_when_club CHECK constraint added",
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  try {
    await queryInterface.describeTable("matches");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("does not exist") ||
      msg.includes("No description found")
    ) {
      return;
    }
    throw err;
  }

  await seq.query(
    `ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_squad_required_when_club`,
  );
  console.log(
    "Migration 152: rolled back — matches_squad_required_when_club CHECK constraint removed",
  );
}
