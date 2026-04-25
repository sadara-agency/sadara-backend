// ═══════════════════════════════════════════════════════════════
// Migration 158: matches.provider_match_id
//
// Phase 3 of the SAFF+ comprehensive integration. Adds a column to
// store the raw provider-side match ID (e.g. SAFF+ exposes match
// pages at /ar/event/match/I2O6x9WBIAOjCTWgMTgP1 — that opaque
// suffix is what we need to store).
//
// Design notes:
//   • Distinct from `external_match_id`, which is a Sadara-internal
//     composite key built for upsert idempotency
//     (`saffplus:slug:date:home-away`). The composite stays around
//     for backwards compatibility with existing rows.
//   • Nullable: existing rows from before this migration have no
//     provider match id; the next scheduled fixtures sync will
//     populate them.
//   • Indexed on (provider_source, provider_match_id) for fast
//     lookup when the live-events cron processes a match.
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Fresh-DB guard
  const [tableRows] = await seq.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'matches'`,
  );
  if ((tableRows as unknown[]).length === 0) {
    console.log("Migration 158: matches missing — skipping (fresh DB guard)");
    return;
  }

  // Idempotency
  const [colRows] = await seq.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'matches'
       AND column_name = 'provider_match_id'`,
  );
  if ((colRows as unknown[]).length === 0) {
    await queryInterface.addColumn("matches", "provider_match_id", {
      type: DataTypes.STRING(120),
      allowNull: true,
    });
  }

  await seq.query(
    `CREATE INDEX IF NOT EXISTS matches_provider_lookup_idx
     ON matches (provider_source, provider_match_id)
     WHERE provider_match_id IS NOT NULL`,
  );

  console.log("Migration 158: matches.provider_match_id column + index added");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  await seq.query(`DROP INDEX IF EXISTS matches_provider_lookup_idx`);
  try {
    await queryInterface.removeColumn("matches", "provider_match_id");
  } catch {
    // tolerate already-removed
  }
  console.log("Migration 158: rolled back");
}
