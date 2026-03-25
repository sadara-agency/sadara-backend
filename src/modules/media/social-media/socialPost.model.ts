import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Attribute Interfaces ──

export type SocialPostType =
  | "match_day"
  | "transfer"
  | "injury_update"
  | "achievement"
  | "general"
  | "custom";

export type SocialPostStatus = "draft" | "scheduled" | "published" | "archived";

export interface SocialPostAttributes {
  id: string;
  title: string;
  titleAr?: string | null;
  contentEn?: string | null;
  contentAr?: string | null;
  postType: SocialPostType;
  platforms: string[];
  status: SocialPostStatus;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  calendarEventId?: string | null;
  playerId?: string | null;
  clubId?: string | null;
  matchId?: string | null;
  imageUrls?: string[] | null;
  tags?: string[] | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SocialPostCreationAttributes extends Optional<
  SocialPostAttributes,
  "id" | "status" | "createdAt" | "updatedAt"
> {}

// ── Model Class ──

export class SocialPost
  extends Model<SocialPostAttributes, SocialPostCreationAttributes>
  implements SocialPostAttributes
{
  declare id: string;
  declare title: string;
  declare titleAr: string | null;
  declare contentEn: string | null;
  declare contentAr: string | null;
  declare postType: SocialPostType;
  declare platforms: string[];
  declare status: SocialPostStatus;
  declare scheduledAt: Date | null;
  declare publishedAt: Date | null;
  declare calendarEventId: string | null;
  declare playerId: string | null;
  declare clubId: string | null;
  declare matchId: string | null;
  declare imageUrls: string[] | null;
  declare tags: string[] | null;
  declare createdBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// ── Initialization ──

SocialPost.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    titleAr: {
      type: DataTypes.STRING(500),
      field: "title_ar",
    },
    contentEn: {
      type: DataTypes.TEXT,
      field: "content_en",
    },
    contentAr: {
      type: DataTypes.TEXT,
      field: "content_ar",
    },
    postType: {
      type: DataTypes.ENUM(
        "match_day",
        "transfer",
        "injury_update",
        "achievement",
        "general",
        "custom",
      ),
      allowNull: false,
      field: "post_type",
    },
    platforms: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    status: {
      type: DataTypes.ENUM("draft", "scheduled", "published", "archived"),
      allowNull: false,
      defaultValue: "draft",
    },
    scheduledAt: {
      type: DataTypes.DATE,
      field: "scheduled_at",
    },
    publishedAt: {
      type: DataTypes.DATE,
      field: "published_at",
    },
    calendarEventId: {
      type: DataTypes.UUID,
      field: "calendar_event_id",
    },
    playerId: {
      type: DataTypes.UUID,
      field: "player_id",
    },
    clubId: {
      type: DataTypes.UUID,
      field: "club_id",
    },
    matchId: {
      type: DataTypes.UUID,
      field: "match_id",
    },
    imageUrls: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      field: "image_urls",
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "social_media_posts",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["status"] },
      { fields: ["post_type"] },
      { fields: ["player_id"] },
      { fields: ["club_id"] },
      { fields: ["created_by"] },
      { fields: ["scheduled_at"] },
    ],
  },
);
