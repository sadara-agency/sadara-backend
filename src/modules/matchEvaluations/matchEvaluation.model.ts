import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Enums ──

export const EVAL_STATUSES = [
  "Draft",
  "PendingReview",
  "Approved",
  "NeedsRevision",
] as const;
export type EvalStatus = (typeof EVAL_STATUSES)[number];

export const REFERRAL_TARGETS = [
  "FitnessCoach",
  "Coach",
  "GoalkeeperCoach",
  "NutritionSpecialist",
  "MentalCoach",
  "Manager",
  "Medical",
] as const;
export type ReferralTarget = (typeof REFERRAL_TARGETS)[number];

// ── Attributes ──

export interface MatchEvaluationAttributes {
  id: string;
  playerId: string;
  matchId?: string | null;
  analystId?: string | null;
  // Match context
  matchDate?: string | null;
  opponent?: string | null;
  competition?: string | null;
  playerPosition?: string | null;
  minutesPlayed?: number | null;
  // Overall
  overallRating?: number | null;
  // Fitness
  fitStrength?: number | null;
  fitSpeed?: number | null;
  fitAgility?: number | null;
  fitFlexibility?: number | null;
  fitEndurance?: number | null;
  // Technical
  techDribbling?: number | null;
  techPassing?: number | null;
  techInsideKick?: number | null;
  techOutsideKick?: number | null;
  techTrapping?: number | null;
  techHeading?: number | null;
  techChestControl?: number | null;
  techThighControl?: number | null;
  techBallAbsorption?: number | null;
  techAssimilation?: number | null;
  techConcentration?: number | null;
  techQuickThinking?: number | null;
  techCoordination?: number | null;
  techReactionSpeed?: number | null;
  // Tactical
  tacAttacking?: number | null;
  tacDefending?: number | null;
  tacPositioning?: number | null;
  tacMovement?: number | null;
  tacTactics?: number | null;
  tacAssimilation?: number | null;
  // Contribution
  conOffensive?: number | null;
  conDefensive?: number | null;
  conCrosses?: number | null;
  conDribbles?: number | null;
  conKeyPasses?: number | null;
  conShots?: number | null;
  conTackles?: number | null;
  conBallRecovery?: number | null;
  conBallLoss?: number | null;
  conDecisionMaking?: number | null;
  conTacticalDiscipline?: number | null;
  // Computed scores (written at save time)
  fitnessScore?: number | null;
  technicalScore?: number | null;
  tacticalScore?: number | null;
  offensiveScore?: number | null;
  defensiveScore?: number | null;
  // Text
  summary?: string | null;
  highlights?: string | null;
  mistakes?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  recommendation?: string | null;
  needsReferral?: boolean;
  referralTarget?: ReferralTarget | null;
  referralId?: string | null;
  // Lifecycle
  status: EvalStatus;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  revisionComment?: string | null;
  // Audit
  createdBy: string;
  displayId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MatchEvaluationCreationAttributes extends Optional<
  MatchEvaluationAttributes,
  | "id"
  | "matchId"
  | "analystId"
  | "matchDate"
  | "opponent"
  | "competition"
  | "playerPosition"
  | "minutesPlayed"
  | "overallRating"
  | "fitStrength"
  | "fitSpeed"
  | "fitAgility"
  | "fitFlexibility"
  | "fitEndurance"
  | "techDribbling"
  | "techPassing"
  | "techInsideKick"
  | "techOutsideKick"
  | "techTrapping"
  | "techHeading"
  | "techChestControl"
  | "techThighControl"
  | "techBallAbsorption"
  | "techAssimilation"
  | "techConcentration"
  | "techQuickThinking"
  | "techCoordination"
  | "techReactionSpeed"
  | "tacAttacking"
  | "tacDefending"
  | "tacPositioning"
  | "tacMovement"
  | "tacTactics"
  | "tacAssimilation"
  | "conOffensive"
  | "conDefensive"
  | "conCrosses"
  | "conDribbles"
  | "conKeyPasses"
  | "conShots"
  | "conTackles"
  | "conBallRecovery"
  | "conBallLoss"
  | "conDecisionMaking"
  | "conTacticalDiscipline"
  | "fitnessScore"
  | "technicalScore"
  | "tacticalScore"
  | "offensiveScore"
  | "defensiveScore"
  | "summary"
  | "highlights"
  | "mistakes"
  | "strengths"
  | "weaknesses"
  | "recommendation"
  | "needsReferral"
  | "referralTarget"
  | "referralId"
  | "status"
  | "approvedBy"
  | "approvedAt"
  | "revisionComment"
  | "displayId"
  | "createdAt"
  | "updatedAt"
> {}

// ── Model ──

class MatchEvaluation
  extends Model<MatchEvaluationAttributes, MatchEvaluationCreationAttributes>
  implements MatchEvaluationAttributes
{
  declare id: string;
  declare playerId: string;
  declare matchId: string | null;
  declare analystId: string | null;
  declare matchDate: string | null;
  declare opponent: string | null;
  declare competition: string | null;
  declare playerPosition: string | null;
  declare minutesPlayed: number | null;
  declare overallRating: number | null;
  declare fitStrength: number | null;
  declare fitSpeed: number | null;
  declare fitAgility: number | null;
  declare fitFlexibility: number | null;
  declare fitEndurance: number | null;
  declare techDribbling: number | null;
  declare techPassing: number | null;
  declare techInsideKick: number | null;
  declare techOutsideKick: number | null;
  declare techTrapping: number | null;
  declare techHeading: number | null;
  declare techChestControl: number | null;
  declare techThighControl: number | null;
  declare techBallAbsorption: number | null;
  declare techAssimilation: number | null;
  declare techConcentration: number | null;
  declare techQuickThinking: number | null;
  declare techCoordination: number | null;
  declare techReactionSpeed: number | null;
  declare tacAttacking: number | null;
  declare tacDefending: number | null;
  declare tacPositioning: number | null;
  declare tacMovement: number | null;
  declare tacTactics: number | null;
  declare tacAssimilation: number | null;
  declare conOffensive: number | null;
  declare conDefensive: number | null;
  declare conCrosses: number | null;
  declare conDribbles: number | null;
  declare conKeyPasses: number | null;
  declare conShots: number | null;
  declare conTackles: number | null;
  declare conBallRecovery: number | null;
  declare conBallLoss: number | null;
  declare conDecisionMaking: number | null;
  declare conTacticalDiscipline: number | null;
  declare fitnessScore: number | null;
  declare technicalScore: number | null;
  declare tacticalScore: number | null;
  declare offensiveScore: number | null;
  declare defensiveScore: number | null;
  declare summary: string | null;
  declare highlights: string | null;
  declare mistakes: string | null;
  declare strengths: string | null;
  declare weaknesses: string | null;
  declare recommendation: string | null;
  declare needsReferral: boolean;
  declare referralTarget: ReferralTarget | null;
  declare referralId: string | null;
  declare status: EvalStatus;
  declare approvedBy: string | null;
  declare approvedAt: Date | null;
  declare revisionComment: string | null;
  declare createdBy: string;
  declare displayId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

MatchEvaluation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    matchId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      field: "match_id",
    },
    analystId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      field: "analyst_id",
    },
    matchDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
      field: "match_date",
    },
    opponent: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    competition: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    playerPosition: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      field: "player_position",
    },
    minutesPlayed: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "minutes_played",
    },
    overallRating: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "overall_rating",
    },
    fitStrength: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "fit_strength",
    },
    fitSpeed: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "fit_speed",
    },
    fitAgility: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "fit_agility",
    },
    fitFlexibility: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "fit_flexibility",
    },
    fitEndurance: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "fit_endurance",
    },
    techDribbling: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_dribbling",
    },
    techPassing: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_passing",
    },
    techInsideKick: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_inside_kick",
    },
    techOutsideKick: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_outside_kick",
    },
    techTrapping: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_trapping",
    },
    techHeading: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_heading",
    },
    techChestControl: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_chest_control",
    },
    techThighControl: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_thigh_control",
    },
    techBallAbsorption: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_ball_absorption",
    },
    techAssimilation: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_assimilation",
    },
    techConcentration: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_concentration",
    },
    techQuickThinking: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_quick_thinking",
    },
    techCoordination: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_coordination",
    },
    techReactionSpeed: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tech_reaction_speed",
    },
    tacAttacking: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tac_attacking",
    },
    tacDefending: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tac_defending",
    },
    tacPositioning: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tac_positioning",
    },
    tacMovement: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tac_movement",
    },
    tacTactics: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tac_tactics",
    },
    tacAssimilation: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "tac_assimilation",
    },
    conOffensive: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_offensive",
    },
    conDefensive: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_defensive",
    },
    conCrosses: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_crosses",
    },
    conDribbles: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_dribbles",
    },
    conKeyPasses: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_key_passes",
    },
    conShots: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_shots",
    },
    conTackles: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_tackles",
    },
    conBallRecovery: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_ball_recovery",
    },
    conBallLoss: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_ball_loss",
    },
    conDecisionMaking: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_decision_making",
    },
    conTacticalDiscipline: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
      field: "con_tactical_discipline",
    },
    fitnessScore: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "fitness_score",
    },
    technicalScore: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "technical_score",
    },
    tacticalScore: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "tactical_score",
    },
    offensiveScore: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "offensive_score",
    },
    defensiveScore: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "defensive_score",
    },
    summary: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    highlights: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    mistakes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    strengths: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    weaknesses: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    recommendation: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    needsReferral: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "needs_referral",
    },
    referralTarget: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      field: "referral_target",
    },
    referralId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      field: "referral_id",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Draft",
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      field: "approved_by",
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "approved_at",
    },
    revisionComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      field: "revision_comment",
    },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: "created_by" },
    displayId: {
      type: DataTypes.STRING(20),
      unique: true,
      field: "display_id",
    },
  },
  {
    sequelize,
    tableName: "match_player_evaluations",
    underscored: true,
    timestamps: true,
  },
);

// ── Player Performance Summary Model ──

export interface PlayerPerformanceSummaryAttributes {
  playerId: string;
  evalCount: number;
  avgOverall?: number | null;
  avgFitness?: number | null;
  avgTechnical?: number | null;
  avgTactical?: number | null;
  avgOffensive?: number | null;
  avgDefensive?: number | null;
  last5Avg?: number | null;
  trend: "improving" | "declining" | "stable";
  lastEvalDate?: string | null;
  updatedAt?: Date;
}

class PlayerPerformanceSummary
  extends Model<PlayerPerformanceSummaryAttributes>
  implements PlayerPerformanceSummaryAttributes
{
  declare playerId: string;
  declare evalCount: number;
  declare avgOverall: number | null;
  declare avgFitness: number | null;
  declare avgTechnical: number | null;
  declare avgTactical: number | null;
  declare avgOffensive: number | null;
  declare avgDefensive: number | null;
  declare last5Avg: number | null;
  declare trend: "improving" | "declining" | "stable";
  declare lastEvalDate: string | null;
  declare readonly updatedAt: Date;
}

PlayerPerformanceSummary.init(
  {
    playerId: { type: DataTypes.UUID, primaryKey: true, field: "player_id" },
    evalCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "eval_count",
    },
    avgOverall: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "avg_overall",
    },
    avgFitness: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "avg_fitness",
    },
    avgTechnical: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "avg_technical",
    },
    avgTactical: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "avg_tactical",
    },
    avgOffensive: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "avg_offensive",
    },
    avgDefensive: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "avg_defensive",
    },
    last5Avg: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
      field: "last_5_avg",
    },
    trend: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "stable",
    },
    lastEvalDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
      field: "last_eval_date",
    },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
  },
  {
    sequelize,
    tableName: "player_performance_summaries",
    underscored: true,
    timestamps: false,
    updatedAt: "updatedAt",
  },
);

export { MatchEvaluation, PlayerPerformanceSummary };
export default MatchEvaluation;
