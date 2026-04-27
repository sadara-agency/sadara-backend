import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type ReportPeriodType = "Season" | "DateRange" | "LastNMatches";
export type ReportStatus =
  | "Draft"
  | "Generating"
  | "Generated"
  | "Failed"
  | "AiDraft"
  | "Reviewing"
  | "Published";

interface TechnicalReportAttributes {
  id: string;
  playerId: string;
  title: string;
  periodType: ReportPeriodType;
  periodParams: Record<string, any>;
  filePath: string | null;
  status: ReportStatus;
  notes: string | null;
  createdBy: string;
  aiDraft: string | null;
  aiModel: string | null;
  promptHash: string | null;
  aiGeneratedAt: Date | null;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TechnicalReportCreation extends Optional<
  TechnicalReportAttributes,
  | "id"
  | "filePath"
  | "status"
  | "notes"
  | "aiDraft"
  | "aiModel"
  | "promptHash"
  | "aiGeneratedAt"
  | "publishedAt"
  | "publishedBy"
  | "createdAt"
  | "updatedAt"
> {}

export class TechnicalReport
  extends Model<TechnicalReportAttributes, TechnicalReportCreation>
  implements TechnicalReportAttributes
{
  declare id: string;
  declare playerId: string;
  declare title: string;
  declare periodType: ReportPeriodType;
  declare periodParams: Record<string, any>;
  declare filePath: string | null;
  declare status: ReportStatus;
  declare notes: string | null;
  declare createdBy: string;
  declare aiDraft: string | null;
  declare aiModel: string | null;
  declare promptHash: string | null;
  declare aiGeneratedAt: Date | null;
  declare publishedAt: Date | null;
  declare publishedBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

TechnicalReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "player_id",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    periodType: {
      type: DataTypes.ENUM("Season", "DateRange", "LastNMatches"),
      allowNull: false,
      field: "period_type",
    },
    periodParams: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "period_params",
    },
    filePath: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "file_path",
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Draft",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
    aiDraft: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "ai_draft",
    },
    aiModel: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "ai_model",
    },
    promptHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: "prompt_hash",
    },
    aiGeneratedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "ai_generated_at",
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "published_at",
    },
    publishedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "published_by",
    },
  },
  {
    sequelize,
    tableName: "technical_reports",
    underscored: true,
    timestamps: true,
  },
);
