import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Rating scale (1–5) used for all sub-dimension items ──
export type ItemRating = 1 | 2 | 3 | 4 | 5;

export interface RatedItem {
  rating: ItemRating;
  note?: string | null;
}

// ── Fitness section (5 items) ──
export interface FitnessScores {
  strength: RatedItem;
  speed: RatedItem;
  agility: RatedItem;
  flexibility: RatedItem;
  endurance: RatedItem;
}

// ── Technical section (14 items) ──
export interface TechnicalScores {
  dribbling: RatedItem;
  passing: RatedItem;
  insideKick: RatedItem;
  outsideKick: RatedItem;
  trappingAndReceiving: RatedItem;
  heading: RatedItem;
  chestControl: RatedItem;
  thighControl: RatedItem;
  ballAbsorption: RatedItem;
  technicalAssimilation: RatedItem;
  concentration: RatedItem;
  quickThinking: RatedItem;
  technicalCoordination: RatedItem;
  reactionSpeed: RatedItem;
}

// ── Tactical section (6 items) ──
export interface TacticalScores {
  attacking: RatedItem;
  defending: RatedItem;
  positioning: RatedItem;
  movement: RatedItem;
  tactics: RatedItem;
  tacticalAssimilation: RatedItem;
}

// ── Match Contribution section (11 items) ──
export interface ContributionScores {
  offensivePerformance: RatedItem;
  defensivePerformance: RatedItem;
  crosses: RatedItem;
  successfulDribbles: RatedItem;
  keyPasses: RatedItem;
  shots: RatedItem;
  tackles: RatedItem;
  ballRecovery: RatedItem;
  ballLoss: RatedItem;
  decisionMaking: RatedItem;
  tacticalDiscipline: RatedItem;
}

export type EvaluationStatus =
  | "Draft"
  | "PendingReview"
  | "Approved"
  | "NeedsRevision";

export const EVALUATION_STATUSES: EvaluationStatus[] = [
  "Draft",
  "PendingReview",
  "Approved",
  "NeedsRevision",
];

export interface MatchEvaluationAttributes {
  id: string;
  matchPlayerId: string;
  matchId: string;
  playerId: string;
  analystId: string;
  overallRating: number;
  fitnessScores: FitnessScores;
  technicalScores: TechnicalScores;
  tacticalScores: TacticalScores;
  contributionScores: ContributionScores;
  summary: string;
  highlights?: string | null;
  mistakes?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  recommendation: string;
  needsReferral: boolean;
  referralId?: string | null;
  status: EvaluationStatus;
  approvalId?: string | null;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  revisionComment?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MatchEvaluationCreationAttributes extends Optional<
  MatchEvaluationAttributes,
  | "id"
  | "highlights"
  | "mistakes"
  | "strengths"
  | "weaknesses"
  | "needsReferral"
  | "referralId"
  | "status"
  | "approvalId"
  | "approvedAt"
  | "approvedBy"
  | "revisionComment"
  | "createdAt"
  | "updatedAt"
> {}

export class MatchEvaluation
  extends Model<MatchEvaluationAttributes, MatchEvaluationCreationAttributes>
  implements MatchEvaluationAttributes
{
  declare id: string;
  declare matchPlayerId: string;
  declare matchId: string;
  declare playerId: string;
  declare analystId: string;
  declare overallRating: number;
  declare fitnessScores: FitnessScores;
  declare technicalScores: TechnicalScores;
  declare tacticalScores: TacticalScores;
  declare contributionScores: ContributionScores;
  declare summary: string;
  declare highlights: string | null;
  declare mistakes: string | null;
  declare strengths: string | null;
  declare weaknesses: string | null;
  declare recommendation: string;
  declare needsReferral: boolean;
  declare referralId: string | null;
  declare status: EvaluationStatus;
  declare approvalId: string | null;
  declare approvedAt: Date | null;
  declare approvedBy: string | null;
  declare revisionComment: string | null;
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
    matchPlayerId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: "match_player_id",
      references: { model: "match_players", key: "id" },
      onDelete: "CASCADE",
    },
    matchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "match_id",
      references: { model: "matches", key: "id" },
      onDelete: "CASCADE",
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "player_id",
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    analystId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "analyst_id",
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    overallRating: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: "overall_rating",
    },
    fitnessScores: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "fitness_scores",
    },
    technicalScores: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "technical_scores",
    },
    tacticalScores: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "tactical_scores",
    },
    contributionScores: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "contribution_scores",
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    highlights: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mistakes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    strengths: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    weaknesses: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recommendation: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    needsReferral: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "needs_referral",
    },
    referralId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "referral_id",
      references: { model: "referrals", key: "id" },
      onDelete: "SET NULL",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Draft",
    },
    approvalId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "approval_id",
      references: { model: "approval_requests", key: "id" },
      onDelete: "SET NULL",
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "approved_at",
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "approved_by",
    },
    revisionComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "revision_comment",
    },
  },
  {
    sequelize,
    tableName: "match_player_evaluations",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["player_id"] },
      { fields: ["match_id"] },
      { fields: ["analyst_id"] },
      { fields: ["status"] },
    ],
  },
);

export default MatchEvaluation;
