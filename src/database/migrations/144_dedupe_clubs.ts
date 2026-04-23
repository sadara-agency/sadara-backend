import { QueryInterface } from "sequelize";

/**
 * One-off cleanup: merge duplicate club rows created by the old SAFF sync.
 *
 * The SAFF sync used `Club.findOrCreate({ where: { name } })` which only
 * matched on the English name. When SAFF sent a spelling variant for a
 * team that already existed under its seeded name, a NEW row was created
 * with a UUID instead of updating the existing seed row.
 *
 * This migration merges each known pair: for every (keep, drop) pair we
 *   1. Copy any column that is NULL / blank on the keep row but populated
 *      on the drop row (logo_url, saff_team_id, etc.).
 *   2. Rewrite every foreign key in the DB that points at the drop id to
 *      point at the keep id instead. Done dynamically via
 *      information_schema.key_column_usage so we don't miss FK tables
 *      added after this migration was written.
 *   3. Delete the drop row.
 *
 * Irreversible — no down migration (a merge cannot be cleanly undone).
 */

/** (keep_id, drop_id) — keep the seeded c0000001-* rows (richer metadata). */
const DUPLICATE_PAIRS: Array<{ keep: string; drop: string; label: string }> = [
  {
    keep: "c0000001-0000-0000-0000-000000000012",
    drop: "f589de00-9730-46e4-8a51-d667e9ead720",
    label: "Al Akhdoud / Al Okhdood (الأخدود)",
  },
  {
    keep: "c0000001-0000-0000-0000-000000000016",
    drop: "6be96e3c-7f0c-4b43-adf4-1dcda0ac7992",
    label: "Al Orubah / Al Orobah (العروبة)",
  },
  {
    keep: "c0000001-0000-0000-0000-000000000017",
    drop: "086ec84a-7f46-495b-8480-c37ff2d60c0c",
    label: "Al Qadsiah / Al Qadisiyah (القادسية)",
  },
];

const MERGE_COLUMNS = [
  "name_ar",
  "logo_url",
  "website",
  "founded_year",
  "stadium",
  "stadium_capacity",
  "primary_color",
  "secondary_color",
  "saff_team_id",
  "spl_team_id",
  "sportmonks_team_id",
  "espn_team_id",
  "city",
  "league",
];

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const sequelize = queryInterface.sequelize;

  const [tableExists] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'clubs' AND table_schema = 'public'`,
  );
  if ((tableExists as unknown[]).length === 0) return;

  for (const pair of DUPLICATE_PAIRS) {
    // Verify both rows exist; skip gracefully if either is missing (e.g. on
    // a fresh DB that never had the SAFF-created duplicates).
    const [rows] = (await sequelize.query(
      `SELECT id FROM clubs WHERE id IN (:keep, :drop)`,
      { replacements: { keep: pair.keep, drop: pair.drop } },
    )) as [Array<{ id: string }>, unknown];
    const ids = new Set(rows.map((r) => r.id));
    if (!ids.has(pair.keep) || !ids.has(pair.drop)) {
      // Nothing to merge for this pair on this DB.
      continue;
    }

    // 1. Backfill NULL/blank columns on the keep row from the drop row.
    //    NULLIF(col::text, '') treats both NULL and empty-string as blank
    //    and casts numerics (founded_year, *_team_id, stadium_capacity) to
    //    text first so the comparison is type-safe for any column.
    for (const col of MERGE_COLUMNS) {
      await sequelize.query(
        `UPDATE clubs k
         SET ${col} = d.${col}
         FROM clubs d
         WHERE k.id = :keep
           AND d.id = :drop
           AND NULLIF(k.${col}::text, '') IS NULL
           AND NULLIF(d.${col}::text, '') IS NOT NULL`,
        { replacements: { keep: pair.keep, drop: pair.drop } },
      );
    }

    // 2. Rewrite every FK in the DB that points at drop → keep.
    //    Discovered dynamically so any table added later is covered.
    const [fkRows] = (await sequelize.query(
      `SELECT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND ccu.table_name = 'clubs'
         AND ccu.column_name = 'id'
         AND tc.table_schema = 'public'`,
    )) as [Array<{ table_name: string; column_name: string }>, unknown];

    for (const fk of fkRows) {
      // Safe because table_name/column_name come from information_schema,
      // not user input.
      await sequelize.query(
        `UPDATE "${fk.table_name}"
         SET "${fk.column_name}" = :keep
         WHERE "${fk.column_name}" = :drop`,
        { replacements: { keep: pair.keep, drop: pair.drop } },
      );
    }

    // 3. Delete the duplicate row.
    await sequelize.query(`DELETE FROM clubs WHERE id = :drop`, {
      replacements: { drop: pair.drop },
    });
  }
}

export async function down(): Promise<void> {
  // Merging duplicate rows and rewriting FKs cannot be cleanly reversed.
  // Restore from a snapshot if you need to undo this.
}
