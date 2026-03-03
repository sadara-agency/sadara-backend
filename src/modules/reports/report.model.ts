import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/database";

export type ReportPeriodType = "Season" | "DateRange" | "LastNMatches";
export type ReportStatus = "Draft" | "Generating" | "Generated" | "Failed";

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
  createdAt?: Date;
  updatedAt?: Date;
}

interface TechnicalReportCreation extends Optional<
  TechnicalReportAttributes,
  "id" | "filePath" | "status" | "notes" | "createdAt" | "updatedAt"
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
      type: DataTypes.ENUM("Draft", "Generating", "Generated", "Failed"),
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
  },
  {
    sequelize,
    tableName: "technical_reports",
    underscored: true,
    timestamps: true,
  },
);
