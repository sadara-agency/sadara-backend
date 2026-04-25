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
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

const TABLES = [
  "matches",
  "match_players",
  "contracts",
  "saff_team_maps",
  "squads",
] as const;

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Fresh-DB guard: every table this migration touches must already exist.
  // Squads is created by 149; matches/match_players/contracts/saff_team_maps
  // by 000_baseline. If any are missing, skip — later baseline runs will
  // bring them in and a re-run of the migrator will pick this up.
  const [rows] = await seq.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN (${TABLES.map(
       (t) => `'${t}'`,
     ).join(", ")})`,
  );
  const existing = new Set(
    (rows as { table_name: string }[]).map((r) => r.table_name),
  );
  for (const t of TABLES) {
    if (!existing.has(t)) {
      console.log(`Migration 150: ${t} missing — skipping (fresh DB guard)`);
      return;
    }
  }

  await addColumnIfMissing(queryInterface, "matches", "home_squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });
  await addColumnIfMissing(queryInterface, "matches", "away_squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });

  await addColumnIfMissing(queryInterface, "match_players", "squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });

  await addColumnIfMissing(queryInterface, "contracts", "squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });

  await addColumnIfMissing(queryInterface, "saff_team_maps", "squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });

  // Indexes — queries will join through these FKs heavily.
  await seq.query(
    `CREATE INDEX IF NOT EXISTS matches_home_squad_id_idx ON matches (home_squad_id)`,
  );
  await seq.query(
    `CREATE INDEX IF NOT EXISTS matches_away_squad_id_idx ON matches (away_squad_id)`,
  );
  await seq.query(
    `CREATE INDEX IF NOT EXISTS match_players_squad_id_idx ON match_players (squad_id)`,
  );
  await seq.query(
    `CREATE INDEX IF NOT EXISTS contracts_squad_id_idx ON contracts (squad_id)`,
  );
  await seq.query(
    `CREATE INDEX IF NOT EXISTS saff_team_maps_squad_id_idx ON saff_team_maps (squad_id)`,
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

async function addColumnIfMissing(
  qi: QueryInterface,
  table: string,
  column: string,
  spec: Parameters<QueryInterface["addColumn"]>[2],
) {
  const seq = (qi as unknown as { sequelize: Sequelize }).sequelize;
  const [rows] = await seq.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    { bind: [table, column] },
  );
  if ((rows as unknown[]).length > 0) return;
  await qi.addColumn(table, column, spec);
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
