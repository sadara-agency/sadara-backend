// ─────────────────────────────────────────────────────────────
// Migration 183 — Pulselive (SPL) match integration: indexes + EPM extension
//
// Adds:
//   1. Partial unique index on matches(provider_source, provider_match_id)
//      so re-syncing the same Pulselive fixture is idempotent.
//   2. entity_type column on external_provider_mappings (default 'player')
//      so Phase C can reuse the same table for team mappings.
//   3. Index on match_events(provider_source, match_id) to speed up
//      provider-scoped event queries.
// ─────────────────────────────────────────────────────────────

import { QueryInterface, DataTypes } from "sequelize";
import {
  addColumnIfMissing,
  removeColumnIfPresent,
  tableExists,
} from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // 1. Partial unique index on matches(provider_source, provider_match_id)
  if (await tableExists(queryInterface, "matches")) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_provider_match
      ON matches (provider_source, provider_match_id)
      WHERE provider_match_id IS NOT NULL
    `);
  }

  // 2. entity_type column on external_provider_mappings (Phase C reuse)
  await addColumnIfMissing(
    queryInterface,
    "external_provider_mappings",
    "entity_type",
    {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "player",
    },
  );

  // 3. Index on match_events(provider_source, match_id)
  if (await tableExists(queryInterface, "match_events")) {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_match_events_provider_match
      ON match_events (provider_source, match_id)
    `);
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS uq_matches_provider_match`,
  );
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_match_events_provider_match`,
  );
  await removeColumnIfPresent(
    queryInterface,
    "external_provider_mappings",
    "entity_type",
  );
}
