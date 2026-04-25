// ═══════════════════════════════════════════════════════════════
// Migration 153: match_events table
//
// Phase 1 of the SAFF+ comprehensive integration. A match_event is a
// single in-match incident — goal, card, substitution, VAR review,
// kickoff, halftime, fulltime, etc. — captured from SAFF+ event
// timeline pages (`/ar/event/match/:matchId`).
//
// Design notes:
//   • Bulk-row append pattern (live tickers update during a match);
//     bad fit for a JSON column on `matches`.
//   • `player_id` is nullable: VAR reviews and period markers (kickoff,
//     halftime, fulltime) have no associated player.
//   • `(match_id, external_event_id, provider_source)` is unique so
//     repeated scrapes during a live match upsert idempotently.
//   • `raw_payload` JSONB preserves the full provider object for
//     debugging when normalization misses a field.
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Fresh-DB guard: matches and players tables come from 000_baseline.
  const [parentRows] = await seq.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('matches', 'players')`,
  );
  const present = new Set(
    (parentRows as { table_name: string }[]).map((r) => r.table_name),
  );
  if (!present.has("matches") || !present.has("players")) {
    console.log(
      "Migration 153: parent tables missing — skipping (fresh DB guard)",
    );
    return;
  }

  // Idempotency
  const [existsRows] = await seq.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'match_events'`,
  );
  if ((existsRows as unknown[]).length > 0) {
    console.log("Migration 153: match_events already exists, skipping");
    return;
  }

  await queryInterface.createTable("match_events", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "matches", key: "id" },
      onDelete: "CASCADE",
    },
    minute: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    stoppage_minute: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      // e.g. "+3" in 45+3
    },
    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      // goal | own_goal | penalty_goal | penalty_miss
      // | yellow | second_yellow | red
      // | sub_in | sub_out | assist
      // | var_review | var_overturn | injury
      // | kickoff | halftime | fulltime
    },
    team_side: {
      type: DataTypes.STRING(10),
      allowNull: false,
      // home | away
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    related_player_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
      // assist_for / sub_partner
    },
    description_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description_en: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    external_event_id: {
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
    `CREATE INDEX IF NOT EXISTS match_events_match_minute_idx
     ON match_events (match_id, minute)`,
  );
  await seq.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS match_events_external_uniq
     ON match_events (match_id, provider_source, external_event_id)
     WHERE external_event_id IS NOT NULL`,
  );
  await seq.query(
    `CREATE INDEX IF NOT EXISTS match_events_player_type_idx
     ON match_events (player_id, type)
     WHERE player_id IS NOT NULL`,
  );

  console.log("Migration 153: match_events table created");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  await seq.query(`DROP INDEX IF EXISTS match_events_player_type_idx`);
  await seq.query(`DROP INDEX IF EXISTS match_events_external_uniq`);
  await seq.query(`DROP INDEX IF EXISTS match_events_match_minute_idx`);
  await queryInterface.dropTable("match_events");
  console.log("Migration 153: rolled back");
}
