import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'matches' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  // ── video_clips ──
  await queryInterface.createTable("video_clips", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "matches", key: "id" },
      onDelete: "SET NULL",
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    title_ar: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    storage_provider: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "external",
      comment: "gcs | external",
    },
    storage_path: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "GCS blob path (when provider=gcs)",
    },
    external_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "YouTube / Vimeo / direct URL (when provider=external)",
    },
    thumbnail_path: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    duration_sec: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    file_size_mb: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    mime_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    start_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Clip start offset in seconds within the source",
    },
    end_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ready",
      comment: "processing | ready | failed",
    },
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex("video_clips", ["match_id"], {
    name: "video_clips_match_idx",
  });
  await queryInterface.addIndex("video_clips", ["player_id"], {
    name: "video_clips_player_idx",
  });
  await queryInterface.addIndex("video_clips", ["status"], {
    name: "video_clips_status_idx",
  });

  // ── video_tags ──
  await queryInterface.createTable("video_tags", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    clip_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "video_clips", key: "id" },
      onDelete: "CASCADE",
    },
    tag_type: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment:
        "goal | assist | defensive_action | set_piece | pressing | transition | mistake | custom",
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    label_ar: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    timestamp_sec: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Seconds from clip start",
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex("video_tags", ["clip_id"], {
    name: "video_tags_clip_idx",
  });
  await queryInterface.addIndex("video_tags", ["tag_type"], {
    name: "video_tags_type_idx",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("video_tags");
  await queryInterface.dropTable("video_clips");
}
