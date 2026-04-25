// ═══════════════════════════════════════════════════════════════
// Migration 150: Wire matches / match_players / contracts to squads
//
// Phase 2 of the SAFF Club/Squad refactor (companion to 149). Adds
// nullable squad references so the codebase can be migrated piece
// by piece — Phase 3 backfills, Phase 4 enforces NOT NULL on matches.
//
//   matches.home_squad_id, matches.away_squad_id   → squads(id)
//   match_players.squad_id                          → squads(id)
//   contracts.squad_id                              → squads(id)
//   saff_team_maps.squad_id                         → squads(id)
//
// All columns are nullable for now. The senior-squad backfill
// (`scripts/backfill-squads.ts`) populates them after migration.
//
// Idempotency uses queryInterface.describeTable() rather than raw
// information_schema queries — Sequelize's seq.query() return shape
// varies (sometimes `[rows, metadata]`, sometimes just `rows`),
// which made the previous bulk pre-check brittle. describeTable
// throws when the table is missing; we catch that and skip cleanly.
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  await safeAddColumn(queryInterface, "matches", "home_squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });
  await safeAddColumn(queryInterface, "matches", "away_squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });

  await safeAddColumn(queryInterface, "match_players", "squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });

  await safeAddColumn(queryInterface, "contracts", "squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });

  await safeAddColumn(queryInterface, "saff_team_maps", "squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });

  // Indexes — queries will join through these FKs heavily.
  // Each index gates on its parent column existing (skipped tables above
  // mean we shouldn't try to index columns that weren't added).
  await safeCreateIndex(
    seq,
    "matches",
    "home_squad_id",
    "matches_home_squad_id_idx",
  );
  await safeCreateIndex(
    seq,
    "matches",
    "away_squad_id",
    "matches_away_squad_id_idx",
  );
  await safeCreateIndex(
    seq,
    "match_players",
    "squad_id",
    "match_players_squad_id_idx",
  );
  await safeCreateIndex(seq, "contracts", "squad_id", "contracts_squad_id_idx");
  await safeCreateIndex(
    seq,
    "saff_team_maps",
    "squad_id",
    "saff_team_maps_squad_id_idx",
  );

  console.log(
    "Migration 150: squad_id columns added to matches/match_players/contracts/saff_team_maps",
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  for (const idx of [
    "saff_team_maps_squad_id_idx",
    "contracts_squad_id_idx",
    "match_players_squad_id_idx",
    "matches_away_squad_id_idx",
    "matches_home_squad_id_idx",
  ]) {
    await seq.query(`DROP INDEX IF EXISTS ${idx}`);
  }
  await removeColumnIfPresent(queryInterface, "saff_team_maps", "squad_id");
  await removeColumnIfPresent(queryInterface, "contracts", "squad_id");
  await removeColumnIfPresent(queryInterface, "match_players", "squad_id");
  await removeColumnIfPresent(queryInterface, "matches", "away_squad_id");
  await removeColumnIfPresent(queryInterface, "matches", "home_squad_id");
  console.log("Migration 150: rolled back");
}

// ── Helpers ──

/**
 * Idempotently add a column. Skips cleanly when:
 *  - the table doesn't exist (fresh-DB before its baseline migration), or
 *  - the column already exists (partial earlier run).
 *
 * Uses describeTable() instead of raw information_schema queries so we
 * don't depend on Sequelize's variable seq.query() return format.
 */
async function safeAddColumn(
  qi: QueryInterface,
  table: string,
  column: string,
  spec: Parameters<QueryInterface["addColumn"]>[2],
) {
  let columns: Record<string, unknown>;
  try {
    columns = (await qi.describeTable(table)) as Record<string, unknown>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // describeTable throws "No description found for X table" when missing
    if (
      msg.includes("does not exist") ||
      msg.includes("No description found")
    ) {
      console.log(
        `Migration 150: ${table} missing — skipping (fresh DB guard)`,
      );
      return;
    }
    throw err;
  }
  if (column in columns) return;
  await qi.addColumn(table, column, spec);
}

async function safeCreateIndex(
  seq: Sequelize,
  table: string,
  column: string,
  indexName: string,
) {
  // Only create the index if the column actually exists; silently skip otherwise.
  // CREATE INDEX IF NOT EXISTS handles duplicate index names; the column-existence
  // check guards against fresh-DB cases where the parent column wasn't added.
  try {
    await seq.query(
      `CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (${column})`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("does not exist") ||
      msg.includes("relation") ||
      msg.includes("column")
    ) {
      // Either the table or the column doesn't exist — fresh-DB skip.
      return;
    }
    throw err;
  }
}

async function removeColumnIfPresent(
  qi: QueryInterface,
  table: string,
  column: string,
) {
  try {
    await qi.removeColumn(table, column);
  } catch {
    // tolerate already-removed columns
  }
}
