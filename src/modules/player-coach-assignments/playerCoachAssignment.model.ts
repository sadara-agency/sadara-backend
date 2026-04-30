import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type StaffRole =
  | "Admin"
  | "Manager"
  | "Analyst"
  | "Scout"
  | "Legal"
  | "Finance"
  | "Coach"
  | "SkillCoach"
  | "TacticalCoach"
  | "FitnessCoach"
  | "NutritionSpecialist"
  | "GymCoach"
  | "GraphicDesigner"
  | "Executive"
  | "GoalkeeperCoach"
  | "MentalCoach";

/** @deprecated Use `StaffRole` — kept for backward compat. */
export type CoachSpecialty = StaffRole;

export type AssignmentStatus =
  | "Assigned"
  | "Acknowledged"
  | "InProgress"
  | "Completed";

export type AssignmentPriority = "low" | "normal" | "high" | "critical";

interface PlayerCoachAssignmentAttributes {
  id: string;
  playerId: string;
  coachUserId: string;
  specialty: StaffRole;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  dueAt: Date | null;
  acknowledgedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlayerCoachAssignmentCreationAttributes extends Optional<
  PlayerCoachAssignmentAttributes,
  | "id"
  | "status"
  | "priority"
  | "dueAt"
  | "acknowledgedAt"
  | "completedAt"
  | "notes"
  | "createdAt"
  | "updatedAt"
> {}

export class PlayerCoachAssignment
  extends Model<
    PlayerCoachAssignmentAttributes,
    PlayerCoachAssignmentCreationAttributes
  >
  implements PlayerCoachAssignmentAttributes
{
  declare id: string;
  declare playerId: string;
  declare coachUserId: string;
  declare specialty: StaffRole;
  declare status: AssignmentStatus;
  declare priority: AssignmentPriority;
  declare dueAt: Date | null;
  declare acknowledgedAt: Date | null;
  declare completedAt: Date | null;
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PlayerCoachAssignment.init(
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
    coachUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "coach_user_id",
    },
    specialty: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Assigned",
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "normal",
    },
    dueAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "due_at",
    },
    acknowledgedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "acknowledged_at",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "player_coach_assignments",
    underscored: true,
    timestamps: true,
  },
);

export default PlayerCoachAssignment;
