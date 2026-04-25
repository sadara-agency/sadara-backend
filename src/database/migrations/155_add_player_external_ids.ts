// ═══════════════════════════════════════════════════════════════
// Migration 155: players.external_ids JSONB column
//
// Phase 1 of the SAFF+ comprehensive integration. Federation IDs are
// going to multiply (SAFF+, SAFF, FIFA, AFC, Sportmonks at the player
// level), so we store them as a JSONB blob keyed by source rather
// than adding one column per provider.
//
// Reconciliation order during scraping:
//   1. exact match on `external_ids->>'saffplus'`
//   2. fuzzy match on (name + DOB + nationality + jersey)
//   3. unmatched → review queue (Phase 2)
//
// GIN index supports `WHERE external_ids @> '{"saffplus": "abc"}'`.
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Fresh-DB guard via describeTable
  let columns: Record<string, unknown>;
  try {
    columns = (await queryInterface.describeTable("players")) as Record<
      string,
      unknown
    >;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("does not exist") ||
      msg.includes("No description found")
    ) {
      console.log("Migration 155: players missing — skipping (fresh DB guard)");
      return;
    }
    throw err;
  }

  // Idempotency: only add the column if it doesn't already exist.
  if (!("external_ids" in columns)) {
    await queryInterface.addColumn("players", "external_ids", {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    });
  }

  await seq.query(
    `CREATE INDEX IF NOT EXISTS players_external_ids_gin_idx
     ON players USING GIN (external_ids)`,
  );

  console.log("Migration 155: players.external_ids column + GIN index added");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  await seq.query(`DROP INDEX IF EXISTS players_external_ids_gin_idx`);
  try {
    await queryInterface.removeColumn("players", "external_ids");
  } catch {
    // tolerate already-removed
  }
  console.log("Migration 155: rolled back");
}
