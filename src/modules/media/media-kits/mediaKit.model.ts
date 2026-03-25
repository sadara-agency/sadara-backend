import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Attribute Interfaces ──

export type MediaKitTemplateType = "player_profile" | "squad_roster";
export type MediaKitLanguage = "en" | "ar" | "both";

export interface MediaKitGenerationAttributes {
  id: string;
  templateType: MediaKitTemplateType;
  language: MediaKitLanguage;
  playerId?: string | null;
  clubId?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  generatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MediaKitGenerationCreationAttributes extends Optional<
  MediaKitGenerationAttributes,
  "id" | "language" | "createdAt" | "updatedAt"
> {}

// ── Model Class ──

export class MediaKitGeneration
  extends Model<
    MediaKitGenerationAttributes,
    MediaKitGenerationCreationAttributes
  >
  implements MediaKitGenerationAttributes
{
  declare id: string;
  declare templateType: MediaKitTemplateType;
  declare language: MediaKitLanguage;
  declare playerId: string | null;
  declare clubId: string | null;
  declare fileUrl: string | null;
  declare fileSize: number | null;
  declare generatedBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// ── Initialization ──

MediaKitGeneration.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    templateType: {
      type: DataTypes.ENUM("player_profile", "squad_roster"),
      allowNull: false,
      field: "template_type",
    },
    language: {
      type: DataTypes.ENUM("en", "ar", "both"),
      allowNull: false,
      defaultValue: "both",
    },
    playerId: {
      type: DataTypes.UUID,
      field: "player_id",
    },
    clubId: {
      type: DataTypes.UUID,
      field: "club_id",
    },
    fileUrl: {
      type: DataTypes.STRING(500),
      field: "file_url",
    },
    fileSize: {
      type: DataTypes.INTEGER,
      field: "file_size",
    },
    generatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "generated_by",
    },
  },
  {
    sequelize,
    tableName: "media_kit_generations",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["player_id"] },
      { fields: ["club_id"] },
      { fields: ["generated_by"] },
      { fields: ["template_type"] },
    ],
  },
);
