// ─────────────────────────────────────────────────────────────
// 264 — performances table
//
// NOTE: the `performances` table is created in 000_baseline.ts with
// id/player_id/match_id/match_date/rating/goals/... and inline FKs to
// players + matches, plus idx_performances_player_id.
//
// The original 264 re-created the table and then indexed match_id — which
// crashed on any DB where baseline already built `performances` (i.e. every
// real environment), because Sequelize createTable on a pre-existing table
// left the schema as baseline defined it. This rewrite is idempotent: it
// only adds the one thing baseline lacks (a unique (player_id, match_id)
// constraint), and guards on table existence for fresh-DB ordering safety.
// ─────────────────────────────────────────────────────────────

import { QueryInterface, QueryTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sequelize = queryInterface.sequelize;

  // migration-lint: disable-next-line
  const tableExists = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'performances' AND table_schema = 'public'`,
    { type: QueryTypes.SELECT },
  );
  if (tableExists.length === 0) return; // baseline not yet applied — nothing to do

  // migration-lint: disable-next-line
  const uniqueIdxExists = await sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = 'performances' AND indexname = 'performances_player_match_unique'`,
    { type: QueryTypes.SELECT },
  );
  if (uniqueIdxExists.length === 0) {
    // migration-lint: disable-next-line
    await queryInterface.addIndex("performances", ["player_id", "match_id"], {
      name: "performances_player_match_unique",
      unique: true,
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Only drop what this migration added. Table itself is owned by baseline.
  // migration-lint: disable-next-line
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS performances_player_match_unique`,
  );
}
