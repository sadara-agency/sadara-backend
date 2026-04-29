// ─────────────────────────────────────────────────────────────
// Migration 184 — Phase B: Pulselive per-match player stats
//
// Adds:
//   1. provider_source column on player_match_stats (default 'manual')
//   2. external_stats_id column on player_match_stats
//   3. Replaces UNIQUE(player_id, match_id) with
//      UNIQUE(player_id, match_id, provider_source) so multi-source rows
//      (manual, pulselive, saffplus) can coexist for the same match.
//   4. provider_source column on match_players
// ─────────────────────────────────────────────────────────────

import { QueryInterface, DataTypes } from "sequelize";
import {
  addColumnIfMissing,
  removeColumnIfPresent,
  tableExists,
  indexExists,
} from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // 1 + 2 — extend player_match_stats
  await addColumnIfMissing(
    queryInterface,
    "player_match_stats",
    "provider_source",
    {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "manual",
    },
  );
  await addColumnIfMissing(
    queryInterface,
    "player_match_stats",
    "external_stats_id",
    {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
  );

  // 3 — replace the old (player_id, match_id) unique
  if (await tableExists(queryInterface, "player_match_stats")) {
    // The original index name from migration 000 is conventionally
    // `player_match_stats_player_id_match_id`; drop it if present.
    if (
      await indexExists(queryInterface, "player_match_stats_player_id_match_id")
    ) {
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS player_match_stats_player_id_match_id`,
      );
    }
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_pms_player_match_provider
      ON player_match_stats (player_id, match_id, provider_source)
    `);
  }

  // 4 — extend match_players
  await addColumnIfMissing(queryInterface, "match_players", "provider_source", {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: "manual",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS uq_pms_player_match_provider`,
  );
  await removeColumnIfPresent(
    queryInterface,
    "player_match_stats",
    "external_stats_id",
  );
  await removeColumnIfPresent(
    queryInterface,
    "player_match_stats",
    "provider_source",
  );
  await removeColumnIfPresent(
    queryInterface,
    "match_players",
    "provider_source",
  );
}
