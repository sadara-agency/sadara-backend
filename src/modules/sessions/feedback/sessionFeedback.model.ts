import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Attribute Interfaces ──

export interface SessionFeedbackAttributes {
  id: string;
  sessionId: string;
  playerId: string;
  coachId: string;
  technicalRating: number | null;
  tacticalRating: number | null;
  physicalRating: number | null;
  mentalRating: number | null;
  overallRating: number | null;
  effortLevel: number | null;
  attitudeRating: number | null;
  strengths: string | null;
  strengthsAr: string | null;
  areasToImprove: string | null;
  areasToImproveAr: string | null;
  coachNotes: string | null;
  coachNotesAr: string | null;
  metrics: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SessionFeedbackCreationAttributes extends Optional<
  SessionFeedbackAttributes,
  | "id"
  | "technicalRating"
  | "tacticalRating"
  | "physicalRating"
  | "mentalRating"
  | "overallRating"
  | "effortLevel"
  | "attitudeRating"
  | "strengths"
  | "strengthsAr"
  | "areasToImprove"
  | "areasToImproveAr"
  | "coachNotes"
  | "coachNotesAr"
  | "metrics"
  | "createdAt"
  | "updatedAt"
> {}

// ── Model Class ──

export class SessionFeedback
  extends Model<SessionFeedbackAttributes, SessionFeedbackCreationAttributes>
  implements SessionFeedbackAttributes
{
  declare id: string;
  declare sessionId: string;
  declare playerId: string;
  declare coachId: string;
  declare technicalRating: number | null;
  declare tacticalRating: number | null;
  declare physicalRating: number | null;
  declare mentalRating: number | null;
  declare overallRating: number | null;
  declare effortLevel: number | null;
  declare attitudeRating: number | null;
  declare strengths: string | null;
  declare strengthsAr: string | null;
  declare areasToImprove: string | null;
  declare areasToImproveAr: string | null;
  declare coachNotes: string | null;
  declare coachNotesAr: string | null;
  declare metrics: Record<string, any> | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// ── Initialization ──

SessionFeedback.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "session_id",
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "player_id",
    },
    coachId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "coach_id",
    },
    technicalRating: {
      type: DataTypes.INTEGER,
      field: "technical_rating",
    },
    tacticalRating: {
      type: DataTypes.INTEGER,
      field: "tactical_rating",
    },
    physicalRating: {
      type: DataTypes.INTEGER,
      field: "physical_rating",
    },
    mentalRating: {
      type: DataTypes.INTEGER,
      field: "mental_rating",
    },
    overallRating: {
      type: DataTypes.DECIMAL(3, 1),
      field: "overall_rating",
    },
    effortLevel: {
      type: DataTypes.INTEGER,
      field: "effort_level",
    },
    attitudeRating: {
      type: DataTypes.INTEGER,
      field: "attitude_rating",
    },
    strengths: {
      type: DataTypes.TEXT,
    },
    strengthsAr: {
      type: DataTypes.TEXT,
      field: "strengths_ar",
    },
    areasToImprove: {
      type: DataTypes.TEXT,
      field: "areas_to_improve",
    },
    areasToImproveAr: {
      type: DataTypes.TEXT,
      field: "areas_to_improve_ar",
    },
    coachNotes: {
      type: DataTypes.TEXT,
      field: "coach_notes",
    },
    coachNotesAr: {
      type: DataTypes.TEXT,
      field: "coach_notes_ar",
    },
    metrics: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: "session_feedback",
    underscored: true,
    timestamps: true,
  },
);
