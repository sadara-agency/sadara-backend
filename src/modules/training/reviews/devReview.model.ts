import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";

export type DevReviewStatus = "draft" | "submitted" | "acknowledged";

interface DevReviewAttributes {
  id: string;
  playerId: string;
  reviewerId: string | null;
  quarterLabel: string;
  reviewDate: string;
  technicalAssessment: Record<string, unknown>;
  tacticalAssessment: Record<string, unknown>;
  physicalAssessment: Record<string, unknown>;
  mentalAssessment: Record<string, unknown>;
  overallRating: number | null;
  strengths: string[];
  developmentAreas: string[];
  shortTermGoals: string[];
  longTermGoals: string[];
  previousGoalsReview: Record<string, unknown>;
  sessionFeedbackSummary: Record<string, unknown>;
  status: DevReviewStatus;
  playerAcknowledgedAt: Date | null;
  notes: string | null;
  notesAr: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DevReviewCreation extends Optional<
  DevReviewAttributes,
  | "id"
  | "reviewerId"
  | "technicalAssessment"
  | "tacticalAssessment"
  | "physicalAssessment"
  | "mentalAssessment"
  | "overallRating"
  | "strengths"
  | "developmentAreas"
  | "shortTermGoals"
  | "longTermGoals"
  | "previousGoalsReview"
  | "sessionFeedbackSummary"
  | "status"
  | "playerAcknowledgedAt"
  | "notes"
  | "notesAr"
  | "createdAt"
  | "updatedAt"
> {}

export class DevelopmentReview
  extends Model<DevReviewAttributes, DevReviewCreation>
  implements DevReviewAttributes
{
  declare id: string;
  declare playerId: string;
  declare reviewerId: string | null;
  declare quarterLabel: string;
  declare reviewDate: string;
  declare technicalAssessment: Record<string, unknown>;
  declare tacticalAssessment: Record<string, unknown>;
  declare physicalAssessment: Record<string, unknown>;
  declare mentalAssessment: Record<string, unknown>;
  declare overallRating: number | null;
  declare strengths: string[];
  declare developmentAreas: string[];
  declare shortTermGoals: string[];
  declare longTermGoals: string[];
  declare previousGoalsReview: Record<string, unknown>;
  declare sessionFeedbackSummary: Record<string, unknown>;
  declare status: DevReviewStatus;
  declare playerAcknowledgedAt: Date | null;
  declare notes: string | null;
  declare notesAr: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare player?: Player;
  declare reviewer?: User;
}

DevelopmentReview.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    reviewerId: { type: DataTypes.UUID, field: "reviewer_id" },
    quarterLabel: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "quarter_label",
    },
    reviewDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "review_date",
    },
    technicalAssessment: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: "technical_assessment",
    },
    tacticalAssessment: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: "tactical_assessment",
    },
    physicalAssessment: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: "physical_assessment",
    },
    mentalAssessment: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: "mental_assessment",
    },
    overallRating: { type: DataTypes.DECIMAL(3, 1), field: "overall_rating" },
    strengths: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    developmentAreas: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
      field: "development_areas",
    },
    shortTermGoals: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
      field: "short_term_goals",
    },
    longTermGoals: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
      field: "long_term_goals",
    },
    previousGoalsReview: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: "previous_goals_review",
    },
    sessionFeedbackSummary: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: "session_feedback_summary",
    },
    status: { type: DataTypes.STRING(20), defaultValue: "draft" },
    playerAcknowledgedAt: {
      type: DataTypes.DATE,
      field: "player_acknowledged_at",
    },
    notes: { type: DataTypes.TEXT },
    notesAr: { type: DataTypes.TEXT, field: "notes_ar" },
  },
  {
    sequelize,
    tableName: "development_reviews",
    underscored: true,
    timestamps: true,
  },
);

// ── Inline associations ──
DevelopmentReview.belongsTo(Player, { foreignKey: "playerId", as: "player" });
Player.hasMany(DevelopmentReview, {
  foreignKey: "playerId",
  as: "developmentReviews",
});

DevelopmentReview.belongsTo(User, { foreignKey: "reviewerId", as: "reviewer" });
