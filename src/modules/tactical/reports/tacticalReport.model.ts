import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";

export type TacticalReportStatus = "draft" | "published";

interface TacticalReportAttributes {
  id: string;
  playerId: string;
  analystId: string | null;
  month: number;
  year: number;
  title: string;
  titleAr: string | null;
  summary: string | null;
  summaryAr: string | null;
  tacticalStrengths: string[];
  tacticalWeaknesses: string[];
  recommendations: string[];
  kpiSnapshot: Record<string, unknown>;
  matchesAnalyzed: number;
  status: TacticalReportStatus;
  filePath: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TacticalReportCreationAttributes extends Optional<
  TacticalReportAttributes,
  | "id"
  | "analystId"
  | "titleAr"
  | "summary"
  | "summaryAr"
  | "tacticalStrengths"
  | "tacticalWeaknesses"
  | "recommendations"
  | "kpiSnapshot"
  | "matchesAnalyzed"
  | "status"
  | "filePath"
  | "createdAt"
  | "updatedAt"
> {}

export class TacticalReport
  extends Model<TacticalReportAttributes, TacticalReportCreationAttributes>
  implements TacticalReportAttributes
{
  declare id: string;
  declare playerId: string;
  declare analystId: string | null;
  declare month: number;
  declare year: number;
  declare title: string;
  declare titleAr: string | null;
  declare summary: string | null;
  declare summaryAr: string | null;
  declare tacticalStrengths: string[];
  declare tacticalWeaknesses: string[];
  declare recommendations: string[];
  declare kpiSnapshot: Record<string, unknown>;
  declare matchesAnalyzed: number;
  declare status: TacticalReportStatus;
  declare filePath: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare player?: Player;
  declare analyst?: User;
}

TacticalReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    analystId: { type: DataTypes.UUID, field: "analyst_id" },
    month: { type: DataTypes.INTEGER, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    titleAr: { type: DataTypes.STRING(255), field: "title_ar" },
    summary: { type: DataTypes.TEXT },
    summaryAr: { type: DataTypes.TEXT, field: "summary_ar" },
    tacticalStrengths: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
      field: "tactical_strengths",
    },
    tacticalWeaknesses: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
      field: "tactical_weaknesses",
    },
    recommendations: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
    },
    kpiSnapshot: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: "kpi_snapshot",
    },
    matchesAnalyzed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "matches_analyzed",
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: "draft",
    },
    filePath: { type: DataTypes.STRING(500), field: "file_path" },
  },
  {
    sequelize,
    tableName: "tactical_reports",
    underscored: true,
    timestamps: true,
  },
);

// ── Inline associations ──
TacticalReport.belongsTo(Player, { foreignKey: "playerId", as: "player" });
Player.hasMany(TacticalReport, {
  foreignKey: "playerId",
  as: "tacticalReports",
});

TacticalReport.belongsTo(User, { foreignKey: "analystId", as: "analyst" });
