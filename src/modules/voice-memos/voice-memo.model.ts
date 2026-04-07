import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface VoiceMemoAttributes {
  id: string;
  ownerType: string;
  ownerId: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  durationSeconds: number;
  recordedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface VoiceMemoCreationAttributes extends Optional<
  VoiceMemoAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class VoiceMemo
  extends Model<VoiceMemoAttributes, VoiceMemoCreationAttributes>
  implements VoiceMemoAttributes
{
  declare id: string;
  declare ownerType: string;
  declare ownerId: string;
  declare fileUrl: string;
  declare fileSize: number;
  declare mimeType: string;
  declare durationSeconds: number;
  declare recordedBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

VoiceMemo.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "owner_type",
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "owner_id",
    },
    fileUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "file_url",
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "file_size",
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "mime_type",
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "duration_seconds",
    },
    recordedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "recorded_by",
    },
  },
  {
    sequelize,
    tableName: "voice_memos",
    underscored: true,
    timestamps: true,
  },
);

export default VoiceMemo;
