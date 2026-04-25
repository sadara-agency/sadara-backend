// ─────────────────────────────────────────────────────────────
// src/modules/matches/matchMedia.model.ts
//
// One row per video artifact attached to a match — live HLS stream,
// VOD replay, condensed highlights, post-match interview, etc.
// Populated by the SAFF+ video-URL extractor (Phase 3 of the
// comprehensive integration); schema lands in Phase 1.
//
// We never re-host video. The URL is the source of truth, and
// `expires_at` lets a refresh cron renew signed manifests before
// they lapse.
// ─────────────────────────────────────────────────────────────
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export const MATCH_MEDIA_TYPES = [
  "live_stream",
  "vod_full",
  "vod_highlights",
  "interview",
  "press_conf",
] as const;

export const MATCH_MEDIA_PROTOCOLS = [
  "hls",
  "dash",
  "mp4",
  "iframe_embed",
  "youtube",
  "twitch",
] as const;

export type MatchMediaType = (typeof MATCH_MEDIA_TYPES)[number];
export type MatchMediaProtocol = (typeof MATCH_MEDIA_PROTOCOLS)[number];
export type MatchMediaLanguage = "ar" | "en" | "both";

export interface MatchMediaAttributes {
  id: string;
  matchId: string;
  mediaType: MatchMediaType;
  streamProtocol: MatchMediaProtocol;
  url: string;
  posterUrl: string | null;
  durationSeconds: number | null;
  language: MatchMediaLanguage;
  requiresAuth: boolean;
  embedOnly: boolean;
  cdnProvider: string | null;
  expiresAt: Date | null;
  externalMediaId: string | null;
  providerSource: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MatchMediaCreationAttributes extends Optional<
  MatchMediaAttributes,
  | "id"
  | "posterUrl"
  | "durationSeconds"
  | "language"
  | "requiresAuth"
  | "embedOnly"
  | "cdnProvider"
  | "expiresAt"
  | "externalMediaId"
  | "providerSource"
  | "createdAt"
  | "updatedAt"
> {}

export class MatchMedia
  extends Model<MatchMediaAttributes, MatchMediaCreationAttributes>
  implements MatchMediaAttributes
{
  declare id: string;
  declare matchId: string;
  declare mediaType: MatchMediaType;
  declare streamProtocol: MatchMediaProtocol;
  declare url: string;
  declare posterUrl: string | null;
  declare durationSeconds: number | null;
  declare language: MatchMediaLanguage;
  declare requiresAuth: boolean;
  declare embedOnly: boolean;
  declare cdnProvider: string | null;
  declare expiresAt: Date | null;
  declare externalMediaId: string | null;
  declare providerSource: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

MatchMedia.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    matchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "match_id",
      references: { model: "matches", key: "id" },
      onDelete: "CASCADE",
    },
    mediaType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "media_type",
    },
    streamProtocol: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "stream_protocol",
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    posterUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "poster_url",
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "duration_seconds",
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "ar",
    },
    requiresAuth: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "requires_auth",
    },
    embedOnly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "embed_only",
    },
    cdnProvider: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: "cdn_provider",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "expires_at",
    },
    externalMediaId: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: "external_media_id",
    },
    providerSource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "saffplus",
      field: "provider_source",
    },
  },
  {
    sequelize,
    tableName: "match_media",
    underscored: true,
    timestamps: true,
  },
);

export default MatchMedia;
