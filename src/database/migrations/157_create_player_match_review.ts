// ═══════════════════════════════════════════════════════════════
// Migration 157: player_match_review table
//
// Phase 2 of the SAFF+ comprehensive integration. Implements the
// "match-only, no auto-create" decision: when SAFF+ provides a
// roster name we can't confidently link to an existing Sadara
// player, we DO NOT create a player record. The unmatched candidate
// lands here for human triage.
//
// Workflow:
//   1. Roster scraper hits unmatched player → insert pending row,
//      attaching the top-N similarity matches as suggestions.
//   2. Admin opens the review queue UI (Phase 2b frontend).
//   3. They either link to an existing player, reject (not relevant),
//      or mark as duplicate of an already-linked review row.
//
// Design notes:
//   • `external_player_id` + provider/squad/season → unique partial
//     index makes re-scrapes idempotent: scraping the same roster
//     twice doesn't bloat the queue.
//   • `linked_player_id` is the resolution outcome when status='linked'.
//     A successful link should also write the squad_membership row
//     (see playerReview.service.ts:linkReviewToPlayer).
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Fresh-DB guard: depends on squads, players, users.
  const [parentRows] = await seq.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('squads', 'players', 'users')`,
  );
  const present = new Set(
    (parentRows as { table_name: string }[]).map((r) => r.table_name),
  );
  if (
    !present.has("squads") ||
    !present.has("players") ||
    !present.has("users")
  ) {
    console.log(
      "Migration 157: parent tables missing — skipping (fresh DB guard)",
    );
    return;
  }

  const [existsRows] = await seq.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'player_match_review'`,
  );
  if ((existsRows as unknown[]).length > 0) {
    console.log("Migration 157: player_match_review already exists, skipping");
    return;
  }

  await queryInterface.createTable("player_match_review", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    scraped_name_ar: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    scraped_name_en: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    scraped_dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    scraped_nationality: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    scraped_jersey_number: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    scraped_position: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    squad_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "squads", key: "id" },
      onDelete: "CASCADE",
    },
    season: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    suggested_player_ids: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      // [{ playerId: string, score: number, reason: string }]
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
      // pending | linked | rejected | duplicate
    },
    linked_player_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    external_player_id: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    provider_source: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "saffplus",
    },
    raw_payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await seq.query(
    `CREATE INDEX IF NOT EXISTS player_match_review_status_created_idx
     ON player_match_review (status, created_at DESC)`,
  );
  await seq.query(
    `CREATE INDEX IF NOT EXISTS player_match_review_squad_season_idx
     ON player_match_review (squad_id, season)`,
  );
  // Idempotent re-scrape: same external player landing in same squad/season
  // for the same provider doesn't create a duplicate review row.
  await seq.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS player_match_review_external_uniq
     ON player_match_review (provider_source, external_player_id, squad_id, season)
     WHERE external_player_id IS NOT NULL AND squad_id IS NOT NULL`,
  );

  console.log("Migration 157: player_match_review table created");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  for (const idx of [
    "player_match_review_external_uniq",
    "player_match_review_squad_season_idx",
    "player_match_review_status_created_idx",
  ]) {
    await seq.query(`DROP INDEX IF EXISTS ${idx}`);
  }
  await queryInterface.dropTable("player_match_review");
  console.log("Migration 157: rolled back");
}
