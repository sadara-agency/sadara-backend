import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type DesignType =
  | "Tweet"
  | "InstagramPost"
  | "Story"
  | "Reel"
  | "Video"
  | "PlayerAnnouncement"
  | "News"
  | "Thread"
  | "Design";

export type DesignStatus =
  | "Idea"
  | "Drafting"
  | "DesignNeeded"
  | "PendingApproval"
  | "Approved"
  | "Scheduled"
  | "Published"
  | "Postponed"
  | "Rejected";

export type DesignFormat =
  | "square_1080"
  | "portrait_1080x1350"
  | "landscape_1920x1080"
  | "custom";

export type DesignPriority = "High" | "Medium" | "Low";

export type DesignPlatform =
  | "X"
  | "Instagram"
  | "TikTok"
  | "LinkedIn"
  | "Snapchat"
  | "YouTubeShorts";

export type ContentPillar =
  | "Brand"
  | "Players"
  | "Commercial"
  | "Community"
  | "Announcements"
  | "Media";

export interface MediaLink {
  kind: "figma" | "drive" | "upload" | "url";
  url: string;
  label?: string;
}

interface DesignAttributes {
  id: string;
  title: string;
  type: DesignType;
  status: DesignStatus;
  format: DesignFormat;
  playerId: string | null;
  matchId: string | null;
  clubId: string | null;
  assetUrl: string | null;
  assetWidth: number | null;
  assetHeight: number | null;
  description: string | null;
  tags: string[] | null;
  createdBy: string;
  publishedAt: Date | null;
  // New media-publishing fields
  platforms: DesignPlatform[] | null;
  copyAr: string | null;
  copyEn: string | null;
  mediaLinks: MediaLink[] | null;
  scheduledAt: Date | null;
  ownerId: string | null;
  approverId: string | null;
  priority: DesignPriority | null;
  contentPillar: ContentPillar | null;
  publishedLink: string | null;
  reviewNotes: string | null;
  eventId: string | null;
  contractId: string | null;
  campaignId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DesignCreationAttributes extends Optional<
  DesignAttributes,
  | "id"
  | "status"
  | "format"
  | "playerId"
  | "matchId"
  | "clubId"
  | "assetUrl"
  | "assetWidth"
  | "assetHeight"
  | "description"
  | "tags"
  | "publishedAt"
  | "platforms"
  | "copyAr"
  | "copyEn"
  | "mediaLinks"
  | "scheduledAt"
  | "ownerId"
  | "approverId"
  | "priority"
  | "contentPillar"
  | "publishedLink"
  | "reviewNotes"
  | "eventId"
  | "contractId"
  | "campaignId"
  | "createdAt"
  | "updatedAt"
> {}

export class Design
  extends Model<DesignAttributes, DesignCreationAttributes>
  implements DesignAttributes
{
  declare id: string;
  declare title: string;
  declare type: DesignType;
  declare status: DesignStatus;
  declare format: DesignFormat;
  declare playerId: string | null;
  declare matchId: string | null;
  declare clubId: string | null;
  declare assetUrl: string | null;
  declare assetWidth: number | null;
  declare assetHeight: number | null;
  declare description: string | null;
  declare tags: string[] | null;
  declare createdBy: string;
  declare publishedAt: Date | null;
  declare platforms: DesignPlatform[] | null;
  declare copyAr: string | null;
  declare copyEn: string | null;
  declare mediaLinks: MediaLink[] | null;
  declare scheduledAt: Date | null;
  declare ownerId: string | null;
  declare approverId: string | null;
  declare priority: DesignPriority | null;
  declare contentPillar: ContentPillar | null;
  declare publishedLink: string | null;
  declare reviewNotes: string | null;
  declare eventId: string | null;
  declare contractId: string | null;
  declare campaignId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Design.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Drafting",
    },
    format: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "square_1080",
    },
    playerId: { type: DataTypes.UUID, allowNull: true, field: "player_id" },
    matchId: { type: DataTypes.UUID, allowNull: true, field: "match_id" },
    clubId: { type: DataTypes.UUID, allowNull: true, field: "club_id" },
    assetUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "asset_url",
    },
    assetWidth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "asset_width",
    },
    assetHeight: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "asset_height",
    },
    description: { type: DataTypes.TEXT, allowNull: true },
    tags: { type: DataTypes.JSONB, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: "created_by" },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "published_at",
    },
    platforms: { type: DataTypes.JSONB, allowNull: true },
    copyAr: { type: DataTypes.TEXT, allowNull: true, field: "copy_ar" },
    copyEn: { type: DataTypes.TEXT, allowNull: true, field: "copy_en" },
    mediaLinks: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "media_links",
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "scheduled_at",
    },
    ownerId: { type: DataTypes.UUID, allowNull: true, field: "owner_id" },
    approverId: { type: DataTypes.UUID, allowNull: true, field: "approver_id" },
    priority: { type: DataTypes.STRING(10), allowNull: true },
    contentPillar: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "content_pillar",
    },
    publishedLink: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "published_link",
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "review_notes",
    },
    eventId: { type: DataTypes.UUID, allowNull: true, field: "event_id" },
    contractId: { type: DataTypes.UUID, allowNull: true, field: "contract_id" },
    campaignId: { type: DataTypes.UUID, allowNull: true, field: "campaign_id" },
  },
  {
    sequelize,
    tableName: "designs",
    underscored: true,
    timestamps: true,
  },
);

export default Design;
