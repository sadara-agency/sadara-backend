import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";

export type ClipStorageProvider = "gcs" | "external";
export type ClipStatus = "processing" | "ready" | "failed";
export type VideoTagType =
  | "goal"
  | "assist"
  | "defensive_action"
  | "set_piece"
  | "pressing"
  | "transition"
  | "mistake"
  | "custom";

// ── VideoClip ──

interface ClipAttributes {
  id: string;
  matchId: string | null;
  playerId: string | null;
  title: string;
  titleAr: string | null;
  storageProvider: ClipStorageProvider;
  storagePath: string | null;
  externalUrl: string | null;
  thumbnailPath: string | null;
  durationSec: number | null;
  fileSizeMb: number | null;
  mimeType: string | null;
  startTime: number | null;
  endTime: number | null;
  status: ClipStatus;
  uploadedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClipCreation extends Optional<
  ClipAttributes,
  | "id"
  | "matchId"
  | "playerId"
  | "titleAr"
  | "storagePath"
  | "externalUrl"
  | "thumbnailPath"
  | "durationSec"
  | "fileSizeMb"
  | "mimeType"
  | "startTime"
  | "endTime"
  | "status"
  | "uploadedBy"
  | "createdAt"
  | "updatedAt"
> {}

export class VideoClip
  extends Model<ClipAttributes, ClipCreation>
  implements ClipAttributes
{
  declare id: string;
  declare matchId: string | null;
  declare playerId: string | null;
  declare title: string;
  declare titleAr: string | null;
  declare storageProvider: ClipStorageProvider;
  declare storagePath: string | null;
  declare externalUrl: string | null;
  declare thumbnailPath: string | null;
  declare durationSec: number | null;
  declare fileSizeMb: number | null;
  declare mimeType: string | null;
  declare startTime: number | null;
  declare endTime: number | null;
  declare status: ClipStatus;
  declare uploadedBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare tags?: VideoTag[];
  declare player?: Player;
}

VideoClip.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    matchId: { type: DataTypes.UUID, field: "match_id" },
    playerId: { type: DataTypes.UUID, field: "player_id" },
    title: { type: DataTypes.STRING(200), allowNull: false },
    titleAr: { type: DataTypes.STRING(200), field: "title_ar" },
    storageProvider: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "external",
      field: "storage_provider",
    },
    storagePath: { type: DataTypes.TEXT, field: "storage_path" },
    externalUrl: { type: DataTypes.TEXT, field: "external_url" },
    thumbnailPath: { type: DataTypes.TEXT, field: "thumbnail_path" },
    durationSec: { type: DataTypes.INTEGER, field: "duration_sec" },
    fileSizeMb: { type: DataTypes.DECIMAL(8, 2), field: "file_size_mb" },
    mimeType: { type: DataTypes.STRING(50), field: "mime_type" },
    startTime: { type: DataTypes.INTEGER, field: "start_time" },
    endTime: { type: DataTypes.INTEGER, field: "end_time" },
    status: { type: DataTypes.STRING(20), defaultValue: "ready" },
    uploadedBy: { type: DataTypes.UUID, field: "uploaded_by" },
  },
  {
    sequelize,
    tableName: "video_clips",
    underscored: true,
    timestamps: true,
  },
);

// ── VideoTag ──

interface TagAttributes {
  id: string;
  clipId: string;
  tagType: VideoTagType;
  label: string | null;
  labelAr: string | null;
  timestampSec: number | null;
  playerId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TagCreation extends Optional<
  TagAttributes,
  | "id"
  | "label"
  | "labelAr"
  | "timestampSec"
  | "playerId"
  | "notes"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class VideoTag
  extends Model<TagAttributes, TagCreation>
  implements TagAttributes
{
  declare id: string;
  declare clipId: string;
  declare tagType: VideoTagType;
  declare label: string | null;
  declare labelAr: string | null;
  declare timestampSec: number | null;
  declare playerId: string | null;
  declare notes: string | null;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

VideoTag.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    clipId: { type: DataTypes.UUID, allowNull: false, field: "clip_id" },
    tagType: {
      type: DataTypes.STRING(40),
      allowNull: false,
      field: "tag_type",
    },
    label: { type: DataTypes.STRING(100) },
    labelAr: { type: DataTypes.STRING(100), field: "label_ar" },
    timestampSec: { type: DataTypes.INTEGER, field: "timestamp_sec" },
    playerId: { type: DataTypes.UUID, field: "player_id" },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "video_tags",
    underscored: true,
    timestamps: true,
  },
);

// ── Inline associations ──
VideoClip.hasMany(VideoTag, { foreignKey: "clipId", as: "tags" });
VideoTag.belongsTo(VideoClip, { foreignKey: "clipId", as: "clip" });

VideoClip.belongsTo(Player, { foreignKey: "playerId", as: "player" });
Player.hasMany(VideoClip, { foreignKey: "playerId", as: "videoClips" });

VideoClip.belongsTo(User, { foreignKey: "uploadedBy", as: "uploader" });
VideoTag.belongsTo(Player, { foreignKey: "playerId", as: "taggedPlayer" });
