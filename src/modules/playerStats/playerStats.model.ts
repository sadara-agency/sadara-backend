import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export interface PlayerSeasonStatsAttributes {
  id: string;
  playerId: string;
  season: string;
  source: "manual" | "computed";
  // General
  matchesPlayed?: number;
  minutesPlayed?: number;
  goals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
  passCompletionRate?: number;
  distanceCovered?: number;
  // Goalkeeper
  cleanSheets?: number;
  savesMade?: number;
  savePercentage?: number;
  penaltiesSaved?: number;
  goalsConceded?: number;
  accurateLongBalls?: number;
  clearances?: number;
  // Defender
  tacklesMade?: number;
  tackleSuccessRate?: number;
  interceptions?: number;
  aerialDuelsWon?: number;
  blocks?: number;
  recoveries?: number;
  // Midfielder
  totalTouches?: number;
  passingAccuracy?: number;
  keyPasses?: number;
  chancesCreated?: number;
  finalThirdPasses?: number;
  progressiveCarries?: number;
  ballRecoveries?: number;
  // Forward
  shotsOnTarget?: number;
  shotAccuracy?: number;
  bigChancesConverted?: number;
  bigChancesMissed?: number;
  successfulDribblesRate?: number;
  xg?: number;
  boxTouches?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlayerSeasonStatsCreationAttributes extends Optional<
  PlayerSeasonStatsAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

class PlayerSeasonStats
  extends Model<
    PlayerSeasonStatsAttributes,
    PlayerSeasonStatsCreationAttributes
  >
  implements PlayerSeasonStatsAttributes
{
  public id!: string;
  public playerId!: string;
  public season!: string;
  public source!: "manual" | "computed";
  public matchesPlayed?: number;
  public minutesPlayed?: number;
  public goals?: number;
  public assists?: number;
  public yellowCards?: number;
  public redCards?: number;
  public passCompletionRate?: number;
  public distanceCovered?: number;
  public cleanSheets?: number;
  public savesMade?: number;
  public savePercentage?: number;
  public penaltiesSaved?: number;
  public goalsConceded?: number;
  public accurateLongBalls?: number;
  public clearances?: number;
  public tacklesMade?: number;
  public tackleSuccessRate?: number;
  public interceptions?: number;
  public aerialDuelsWon?: number;
  public blocks?: number;
  public recoveries?: number;
  public totalTouches?: number;
  public passingAccuracy?: number;
  public keyPasses?: number;
  public chancesCreated?: number;
  public finalThirdPasses?: number;
  public progressiveCarries?: number;
  public ballRecoveries?: number;
  public shotsOnTarget?: number;
  public shotAccuracy?: number;
  public bigChancesConverted?: number;
  public bigChancesMissed?: number;
  public successfulDribblesRate?: number;
  public xg?: number;
  public boxTouches?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PlayerSeasonStats.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false },
    season: { type: DataTypes.STRING(10), allowNull: false },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "manual",
    },
    matchesPlayed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    minutesPlayed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    goals: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    assists: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    yellowCards: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    redCards: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    passCompletionRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    distanceCovered: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    cleanSheets: { type: DataTypes.INTEGER, allowNull: true },
    savesMade: { type: DataTypes.INTEGER, allowNull: true },
    savePercentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    penaltiesSaved: { type: DataTypes.INTEGER, allowNull: true },
    goalsConceded: { type: DataTypes.INTEGER, allowNull: true },
    accurateLongBalls: { type: DataTypes.INTEGER, allowNull: true },
    clearances: { type: DataTypes.INTEGER, allowNull: true },
    tacklesMade: { type: DataTypes.INTEGER, allowNull: true },
    tackleSuccessRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    interceptions: { type: DataTypes.INTEGER, allowNull: true },
    aerialDuelsWon: { type: DataTypes.INTEGER, allowNull: true },
    blocks: { type: DataTypes.INTEGER, allowNull: true },
    recoveries: { type: DataTypes.INTEGER, allowNull: true },
    totalTouches: { type: DataTypes.INTEGER, allowNull: true },
    passingAccuracy: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    keyPasses: { type: DataTypes.INTEGER, allowNull: true },
    chancesCreated: { type: DataTypes.INTEGER, allowNull: true },
    finalThirdPasses: { type: DataTypes.INTEGER, allowNull: true },
    progressiveCarries: { type: DataTypes.INTEGER, allowNull: true },
    ballRecoveries: { type: DataTypes.INTEGER, allowNull: true },
    shotsOnTarget: { type: DataTypes.INTEGER, allowNull: true },
    shotAccuracy: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    bigChancesConverted: { type: DataTypes.INTEGER, allowNull: true },
    bigChancesMissed: { type: DataTypes.INTEGER, allowNull: true },
    successfulDribblesRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    xg: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    boxTouches: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    tableName: "player_season_stats",
    underscored: true,
    timestamps: true,
  },
);

export default PlayerSeasonStats;
