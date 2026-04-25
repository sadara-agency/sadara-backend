// ═══════════════════════════════════════════════════════════════
// Migration 156: squad_memberships table
//
// Phase 2 of the SAFF+ comprehensive integration. Answers the
// historical question "who was on Al-Hilal U18 in 2024-25?" — which
// `players.current_club_id` cannot answer because it only reflects
// *now*.
//
// Design notes:
//   • One row per (squad, player, season) — uniqueness enforced.
//   • `joined_at` / `left_at` are nullable; the SAFF+ scraper rarely
//     has exact dates, so they're optional metadata.
//   • `external_membership_id` lets re-scrapes upsert idempotently
//     when SAFF+ exposes a stable roster row id.
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Fresh-DB guard: depends on squads (149) + players (000_baseline).
  const [parentRows] = await seq.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('squads', 'players')`,
  );
  const present = new Set(
    (parentRows as { table_name: string }[]).map((r) => r.table_name),
  );
  if (!present.has("squads") || !present.has("players")) {
    console.log(
      "Migration 156: parent tables missing — skipping (fresh DB guard)",
    );
    return;
  }

  // Idempotency
  const [existsRows] = await seq.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'squad_memberships'`,
  );
  if ((existsRows as unknown[]).length > 0) {
    console.log("Migration 156: squad_memberships already exists, skipping");
    return;
  }

  await queryInterface.createTable("squad_memberships", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    squad_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "squads", key: "id" },
      onDelete: "CASCADE",
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    season: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    jersey_number: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    position: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    joined_at: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    left_at: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    external_membership_id: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    provider_source: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "saffplus",
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await seq.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS squad_memberships_squad_player_season_uniq
     ON squad_memberships (squad_id, player_id, season)`,
  );
  await seq.query(
    `CREATE INDEX IF NOT EXISTS squad_memberships_squad_season_idx
     ON squad_memberships (squad_id, season)`,
  );
  await seq.query(
    `CREATE INDEX IF NOT EXISTS squad_memberships_player_season_idx
     ON squad_memberships (player_id, season)`,
  );
  // Enables idempotent upsert when external_membership_id is provided.
  await seq.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS squad_memberships_external_uniq
     ON squad_memberships (provider_source, external_membership_id)
     WHERE external_membership_id IS NOT NULL`,
  );

  console.log("Migration 156: squad_memberships table created");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  for (const idx of [
    "squad_memberships_external_uniq",
    "squad_memberships_player_season_idx",
    "squad_memberships_squad_season_idx",
    "squad_memberships_squad_player_season_uniq",
  ]) {
    await seq.query(`DROP INDEX IF EXISTS ${idx}`);
  }
  await queryInterface.dropTable("squad_memberships");
  console.log("Migration 156: rolled back");
}
