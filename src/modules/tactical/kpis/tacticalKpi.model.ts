import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Player } from "@modules/players/player.model";
import { Match } from "@modules/matches/match.model";
import { User } from "@modules/users/user.model";

interface TacticalKpiAttributes {
  id: string;
  playerId: string;
  matchId: string;
  pressIntensity: number | null;
  defensiveContributionPct: number | null;
  progressivePassRate: number | null;
  chancesCreatedPer90: number | null;
  xgContribution: number | null;
  territorialControl: number | null;
  counterPressSuccess: number | null;
  buildUpInvolvement: number | null;
  overallTacticalScore: number | null;
  computedAt: Date | null;
  computedBy: string;
  rawData: Record<string, unknown>;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TacticalKpiCreationAttributes extends Optional<
  TacticalKpiAttributes,
  | "id"
  | "pressIntensity"
  | "defensiveContributionPct"
  | "progressivePassRate"
  | "chancesCreatedPer90"
  | "xgContribution"
  | "territorialControl"
  | "counterPressSuccess"
  | "buildUpInvolvement"
  | "overallTacticalScore"
  | "computedAt"
  | "computedBy"
  | "rawData"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class TacticalKpi
  extends Model<TacticalKpiAttributes, TacticalKpiCreationAttributes>
  implements TacticalKpiAttributes
{
  declare id: string;
  declare playerId: string;
  declare matchId: string;
  declare pressIntensity: number | null;
  declare defensiveContributionPct: number | null;
  declare progressivePassRate: number | null;
  declare chancesCreatedPer90: number | null;
  declare xgContribution: number | null;
  declare territorialControl: number | null;
  declare counterPressSuccess: number | null;
  declare buildUpInvolvement: number | null;
  declare overallTacticalScore: number | null;
  declare computedAt: Date | null;
  declare computedBy: string;
  declare rawData: Record<string, unknown>;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare player?: Player;
  declare match?: Match;
  declare creator?: User;
}

TacticalKpi.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    matchId: { type: DataTypes.UUID, allowNull: false, field: "match_id" },
    pressIntensity: { type: DataTypes.DECIMAL(6, 2), field: "press_intensity" },
    defensiveContributionPct: {
      type: DataTypes.DECIMAL(5, 2),
      field: "defensive_contribution_pct",
    },
    progressivePassRate: {
      type: DataTypes.DECIMAL(5, 2),
      field: "progressive_pass_rate",
    },
    chancesCreatedPer90: {
      type: DataTypes.DECIMAL(6, 2),
      field: "chances_created_per90",
    },
    xgContribution: { type: DataTypes.DECIMAL(6, 3), field: "xg_contribution" },
    territorialControl: {
      type: DataTypes.DECIMAL(5, 2),
      field: "territorial_control",
    },
    counterPressSuccess: {
      type: DataTypes.DECIMAL(5, 2),
      field: "counter_press_success",
    },
    buildUpInvolvement: {
      type: DataTypes.DECIMAL(6, 2),
      field: "build_up_involvement",
    },
    overallTacticalScore: {
      type: DataTypes.DECIMAL(5, 2),
      field: "overall_tactical_score",
    },
    computedAt: { type: DataTypes.DATE, field: "computed_at" },
    computedBy: {
      type: DataTypes.STRING(20),
      defaultValue: "system",
      field: "computed_by",
    },
    rawData: { type: DataTypes.JSONB, defaultValue: {}, field: "raw_data" },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "tactical_kpi_scores",
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ["player_id", "match_id"] }],
  },
);

// ── Inline associations ──
TacticalKpi.belongsTo(Player, { foreignKey: "playerId", as: "player" });
Player.hasMany(TacticalKpi, { foreignKey: "playerId", as: "tacticalKpis" });

TacticalKpi.belongsTo(Match, { foreignKey: "matchId", as: "match" });
Match.hasMany(TacticalKpi, { foreignKey: "matchId", as: "tacticalKpis" });

TacticalKpi.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
