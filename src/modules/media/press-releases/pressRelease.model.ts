import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Attribute Interfaces ──

export type PressReleaseCategory =
  | "transfer"
  | "injury"
  | "achievement"
  | "announcement"
  | "general";

export type PressReleaseStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "archived";

export interface PressReleaseAttributes {
  id: string;
  title: string;
  titleAr?: string | null;
  slug?: string | null;
  category: PressReleaseCategory;
  contentEn?: string | null;
  contentAr?: string | null;
  excerptEn?: string | null;
  excerptAr?: string | null;
  coverImageUrl?: string | null;
  status: PressReleaseStatus;
  publishedAt?: Date | null;
  reviewedBy?: string | null;
  approvedBy?: string | null;
  playerId?: string | null;
  clubId?: string | null;
  matchId?: string | null;
  tags?: string[] | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PressReleaseCreationAttributes extends Optional<
  PressReleaseAttributes,
  "id" | "status" | "category" | "createdAt" | "updatedAt"
> {}

// ── Model Class ──

export class PressRelease
  extends Model<PressReleaseAttributes, PressReleaseCreationAttributes>
  implements PressReleaseAttributes
{
  declare id: string;
  declare title: string;
  declare titleAr: string | null;
  declare slug: string | null;
  declare category: PressReleaseCategory;
  declare contentEn: string | null;
  declare contentAr: string | null;
  declare excerptEn: string | null;
  declare excerptAr: string | null;
  declare coverImageUrl: string | null;
  declare status: PressReleaseStatus;
  declare publishedAt: Date | null;
  declare reviewedBy: string | null;
  declare approvedBy: string | null;
  declare playerId: string | null;
  declare clubId: string | null;
  declare matchId: string | null;
  declare tags: string[] | null;
  declare createdBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// ── Initialization ──

PressRelease.init(
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
    slug: {
      type: DataTypes.STRING(500),
      unique: true,
    },
    category: {
      type: DataTypes.ENUM(
        "transfer",
        "injury",
        "achievement",
        "announcement",
        "general",
      ),
      allowNull: false,
      defaultValue: "general",
    },
    contentEn: {
      type: DataTypes.TEXT,
      field: "content_en",
    },
    contentAr: {
      type: DataTypes.TEXT,
      field: "content_ar",
    },
    excerptEn: {
      type: DataTypes.STRING(1000),
      field: "excerpt_en",
    },
    excerptAr: {
      type: DataTypes.STRING(1000),
      field: "excerpt_ar",
    },
    coverImageUrl: {
      type: DataTypes.STRING(500),
      field: "cover_image_url",
    },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "review",
        "approved",
        "published",
        "archived",
      ),
      allowNull: false,
      defaultValue: "draft",
    },
    publishedAt: {
      type: DataTypes.DATE,
      field: "published_at",
    },
    reviewedBy: {
      type: DataTypes.UUID,
      field: "reviewed_by",
    },
    approvedBy: {
      type: DataTypes.UUID,
      field: "approved_by",
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
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "press_releases",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["status"] },
      { fields: ["category"] },
      { fields: ["player_id"] },
      { fields: ["published_at"] },
      { fields: ["slug"], unique: true },
    ],
  },
);
