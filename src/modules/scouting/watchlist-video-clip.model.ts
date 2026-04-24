import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type ClipType = "link" | "upload";

interface WatchlistVideoClipAttributes {
  id: string;
  watchlistId: string;
  title: string | null;
  clipType: ClipType;
  url: string | null;
  fileKey: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WatchlistVideoClipCreationAttributes extends Optional<
  WatchlistVideoClipAttributes,
  | "id"
  | "title"
  | "url"
  | "fileKey"
  | "fileUrl"
  | "fileSize"
  | "mimeType"
  | "uploadedBy"
  | "createdAt"
  | "updatedAt"
> {}

class WatchlistVideoClip
  extends Model<
    WatchlistVideoClipAttributes,
    WatchlistVideoClipCreationAttributes
  >
  implements WatchlistVideoClipAttributes
{
  public id!: string;
  public watchlistId!: string;
  public title!: string | null;
  public clipType!: ClipType;
  public url!: string | null;
  public fileKey!: string | null;
  public fileUrl!: string | null;
  public fileSize!: number | null;
  public mimeType!: string | null;
  public uploadedBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WatchlistVideoClip.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    watchlistId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    clipType: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fileKey: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fileUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "watchlist_video_clips",
    underscored: true,
    timestamps: true,
  },
);

export default WatchlistVideoClip;
