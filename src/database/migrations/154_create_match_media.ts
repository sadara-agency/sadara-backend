// ═══════════════════════════════════════════════════════════════
// Migration 154: match_media table
//
// Phase 1 of the SAFF+ comprehensive integration. A match_media row
// is one media artifact attached to a match — live HLS stream, VOD
// replay, condensed highlights, post-match interview, press conf,
// etc. Some matches have several; columns on `matches` would force
// null sprawl.
//
// Design notes:
//   • `expires_at` exists because most HLS manifests carry signed
//     URLs that lapse in hours. A cron refreshes near-expired rows
//     (Phase 4 of the rollout).
//   • `embed_only=true` instructs the frontend to render via <iframe>
//     instead of hls.js — used when the provider blocks hotlinking.
//   • We never re-host video; the URL is the source of truth.
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Fresh-DB guard
  const [parentRows] = await seq.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'matches'`,
  );
  if ((parentRows as unknown[]).length === 0) {
    console.log(
      "Migration 154: matches table missing — skipping (fresh DB guard)",
    );
    return;
  }

  // Idempotency
  const [existsRows] = await seq.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'match_media'`,
  );
  if ((existsRows as unknown[]).length > 0) {
    console.log("Migration 154: match_media already exists, skipping");
    return;
  }

  await queryInterface.createTable("match_media", {
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
    media_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      // live_stream | vod_full | vod_highlights | interview | press_conf
    },
    stream_protocol: {
      type: DataTypes.STRING(20),
      allowNull: false,
      // hls | dash | mp4 | iframe_embed | youtube | twitch
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    poster_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "ar",
      // ar | en | both
    },
    requires_auth: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    embed_only: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    cdn_provider: {
      type: DataTypes.STRING(40),
      allowNull: true,
      // sadeem | streamonics | vimeo | youtube | ...
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    external_media_id: {
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
    `CREATE INDEX IF NOT EXISTS match_media_match_id_idx
     ON match_media (match_id)`,
  );
  await seq.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS match_media_external_uniq
     ON match_media (match_id, provider_source, external_media_id)
     WHERE external_media_id IS NOT NULL`,
  );
  // For the refresh-expiring cron — partial index keeps it tiny.
  await seq.query(
    `CREATE INDEX IF NOT EXISTS match_media_expires_at_idx
     ON match_media (expires_at)
     WHERE expires_at IS NOT NULL`,
  );

  console.log("Migration 154: match_media table created");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  await seq.query(`DROP INDEX IF EXISTS match_media_expires_at_idx`);
  await seq.query(`DROP INDEX IF EXISTS match_media_external_uniq`);
  await seq.query(`DROP INDEX IF EXISTS match_media_match_id_idx`);
  await queryInterface.dropTable("match_media");
  console.log("Migration 154: rolled back");
}
