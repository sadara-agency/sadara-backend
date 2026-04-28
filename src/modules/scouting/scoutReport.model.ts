import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type Recommendation = "Sign" | "Monitor" | "Reject";

export interface ScoutReportAttributes {
  id: string;
  watchlistId: string;
  authoredBy: string | null;
  pace: number | null;
  strength: number | null;
  stamina: number | null;
  ballControl: number | null;
  passing: number | null;
  shooting: number | null;
  defending: number | null;
  decisionMaking: number | null;
  leadership: number | null;
  workRate: number | null;
  positioning: number | null;
  pressingScore: number | null;
  tacticalAwareness: number | null;
  composure: number | null;
  resilience: number | null;
  teamFit: number | null;
  communication: number | null;
  coachability: number | null;
  offFieldConduct: number | null;
  overallScore: number | null;
  recommendation: Recommendation | null;
  notes: string | null;
  notesAr: string | null;
  similarWatchlistIds: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ScoutReportCreationAttributes extends Optional<
  ScoutReportAttributes,
  | "id"
  | "authoredBy"
  | "pace"
  | "strength"
  | "stamina"
  | "ballControl"
  | "passing"
  | "shooting"
  | "defending"
  | "decisionMaking"
  | "leadership"
  | "workRate"
  | "positioning"
  | "pressingScore"
  | "tacticalAwareness"
  | "composure"
  | "resilience"
  | "teamFit"
  | "communication"
  | "coachability"
  | "offFieldConduct"
  | "overallScore"
  | "recommendation"
  | "notes"
  | "notesAr"
  | "similarWatchlistIds"
  | "createdAt"
  | "updatedAt"
> {}

class ScoutReport
  extends Model<ScoutReportAttributes, ScoutReportCreationAttributes>
  implements ScoutReportAttributes
{
  public id!: string;
  public watchlistId!: string;
  public authoredBy!: string | null;
  public pace!: number | null;
  public strength!: number | null;
  public stamina!: number | null;
  public ballControl!: number | null;
  public passing!: number | null;
  public shooting!: number | null;
  public defending!: number | null;
  public decisionMaking!: number | null;
  public leadership!: number | null;
  public workRate!: number | null;
  public positioning!: number | null;
  public pressingScore!: number | null;
  public tacticalAwareness!: number | null;
  public composure!: number | null;
  public resilience!: number | null;
  public teamFit!: number | null;
  public communication!: number | null;
  public coachability!: number | null;
  public offFieldConduct!: number | null;
  public overallScore!: number | null;
  public recommendation!: Recommendation | null;
  public notes!: string | null;
  public notesAr!: string | null;
  public similarWatchlistIds!: string[] | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ScoutReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    watchlistId: { type: DataTypes.UUID, allowNull: false },
    authoredBy: { type: DataTypes.UUID, allowNull: true },
    pace: { type: DataTypes.INTEGER, allowNull: true },
    strength: { type: DataTypes.INTEGER, allowNull: true },
    stamina: { type: DataTypes.INTEGER, allowNull: true },
    ballControl: { type: DataTypes.INTEGER, allowNull: true },
    passing: { type: DataTypes.INTEGER, allowNull: true },
    shooting: { type: DataTypes.INTEGER, allowNull: true },
    defending: { type: DataTypes.INTEGER, allowNull: true },
    decisionMaking: { type: DataTypes.INTEGER, allowNull: true },
    leadership: { type: DataTypes.INTEGER, allowNull: true },
    workRate: { type: DataTypes.INTEGER, allowNull: true },
    positioning: { type: DataTypes.INTEGER, allowNull: true },
    pressingScore: { type: DataTypes.INTEGER, allowNull: true },
    tacticalAwareness: { type: DataTypes.INTEGER, allowNull: true },
    composure: { type: DataTypes.INTEGER, allowNull: true },
    resilience: { type: DataTypes.INTEGER, allowNull: true },
    teamFit: { type: DataTypes.INTEGER, allowNull: true },
    communication: { type: DataTypes.INTEGER, allowNull: true },
    coachability: { type: DataTypes.INTEGER, allowNull: true },
    offFieldConduct: { type: DataTypes.INTEGER, allowNull: true },
    overallScore: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    recommendation: { type: DataTypes.STRING(20), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    notesAr: { type: DataTypes.TEXT, allowNull: true },
    similarWatchlistIds: { type: DataTypes.JSONB, allowNull: true },
  },
  {
    sequelize,
    tableName: "scout_report_attributes",
    underscored: true,
    timestamps: true,
  },
);

export default ScoutReport;
