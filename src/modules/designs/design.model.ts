import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type DesignType =
  | "pre_match"
  | "post_match"
  | "profile_card"
  | "match_day_poster"
  | "social_post"
  | "motm"
  | "quote"
  | "milestone";

export type DesignStatus =
  | "draft"
  | "in_progress"
  | "review"
  | "approved"
  | "published"
  | "archived";

export type DesignFormat =
  | "square_1080"
  | "portrait_1080x1350"
  | "landscape_1920x1080"
  | "custom";

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
      defaultValue: "draft",
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
  },
  {
    sequelize,
    tableName: "designs",
    underscored: true,
    timestamps: true,
  },
);

export default Design;
