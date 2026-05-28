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

export type ReportType =
  | "PreSigning"
  | "MidSeason"
  | "MatchReport"
  | "Periodic"
  | "Scouting";

export type ReportVerdict =
  | "Primary"
  | "Monitor"
  | "Reject"
  | "Promote"
  | "Hold";

export interface RatingBucket {
  [attribute: string]: number;
}

export interface StructuredContent {
  header?: {
    date?: string;
    scoutName?: string;
  };
  ratings?: {
    technical?: RatingBucket;
    tactical?: RatingBucket;
    physical?: RatingBucket;
    mental?: RatingBucket;
  };
  qualitative?: {
    overview?: string;
    strengths?: string;
    improvements?: string;
    recommendation?: string;
  };
  kpis?: {
    goals?: number;
    assists?: number;
    passAccuracy?: number;
    minutesPlayed?: number;
    keyPasses?: number;
    tackles?: number;
  };
}

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
  reportType: ReportType | null;
  matchContext: string | null;
  overallScore: number | null;
  verdict: ReportVerdict | null;
  readiness: number | null;
  potential: number | null;
  structuredContent: StructuredContent | null;
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
  | "reportType"
  | "matchContext"
  | "overallScore"
  | "verdict"
  | "readiness"
  | "potential"
  | "structuredContent"
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
  declare reportType: ReportType | null;
  declare matchContext: string | null;
  declare overallScore: number | null;
  declare verdict: ReportVerdict | null;
  declare readiness: number | null;
  declare potential: number | null;
  declare structuredContent: StructuredContent | null;
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
    reportType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "report_type",
    },
    matchContext: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "match_context",
    },
    overallScore: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      field: "overall_score",
    },
    verdict: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    readiness: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    potential: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    structuredContent: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "structured_content",
    },
  },
  {
    sequelize,
    tableName: "technical_reports",
    underscored: true,
    timestamps: true,
  },
);
