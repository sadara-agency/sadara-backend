import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Enum Types ──

export type SessionType =
  | "Physical"
  | "Skill"
  | "Tactical"
  | "Mental"
  | "Nutrition"
  | "PerformanceAssessment"
  | "Goalkeeper";

export type ProgramOwner =
  | "FitnessCoach"
  | "Coach"
  | "SkillCoach"
  | "TacticalCoach"
  | "GoalkeeperCoach"
  | "Analyst"
  | "NutritionSpecialist"
  | "MentalCoach";

export type SessionCompletionStatus =
  | "Scheduled"
  | "Completed"
  | "Cancelled"
  | "NoShow";

// ── Attribute Interfaces ──

export interface SessionAttributes {
  id: string;
  playerId: string;
  referralId: string;
  sessionType: SessionType;
  programOwner: ProgramOwner;
  responsibleId: string | null;
  sessionDate: string;
  title: string | null;
  titleAr: string | null;
  summary: string | null;
  summaryAr: string | null;
  notes: string | null;
  notesAr: string | null;
  completionStatus: SessionCompletionStatus;
  journeyStageId: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SessionCreationAttributes extends Optional<
  SessionAttributes,
  | "id"
  | "responsibleId"
  | "title"
  | "titleAr"
  | "summary"
  | "summaryAr"
  | "notes"
  | "notesAr"
  | "completionStatus"
  | "journeyStageId"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

// ── Model Class ──

export class Session
  extends Model<SessionAttributes, SessionCreationAttributes>
  implements SessionAttributes
{
  declare id: string;
  declare playerId: string;
  declare referralId: string;
  declare sessionType: SessionType;
  declare programOwner: ProgramOwner;
  declare responsibleId: string | null;
  declare sessionDate: string;
  declare title: string | null;
  declare titleAr: string | null;
  declare summary: string | null;
  declare summaryAr: string | null;
  declare notes: string | null;
  declare notesAr: string | null;
  declare completionStatus: SessionCompletionStatus;
  declare journeyStageId: string | null;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// ── Initialization ──

Session.init(
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
    referralId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "referral_id",
    },
    sessionType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "session_type",
    },
    programOwner: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "program_owner",
    },
    responsibleId: {
      type: DataTypes.UUID,
      field: "responsible_id",
    },
    sessionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "session_date",
    },
    title: {
      type: DataTypes.STRING(255),
    },
    titleAr: {
      type: DataTypes.STRING(255),
      field: "title_ar",
    },
    summary: {
      type: DataTypes.TEXT,
    },
    summaryAr: {
      type: DataTypes.TEXT,
      field: "summary_ar",
    },
    notes: {
      type: DataTypes.TEXT,
    },
    notesAr: {
      type: DataTypes.TEXT,
      field: "notes_ar",
    },
    completionStatus: {
      type: DataTypes.STRING(50),
      defaultValue: "Scheduled",
      field: "completion_status",
    },
    journeyStageId: {
      type: DataTypes.UUID,
      field: "journey_stage_id",
    },
    createdBy: {
      type: DataTypes.UUID,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "sessions",
    underscored: true,
    timestamps: true,
  },
);
