import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type CoachSpecialty =
  | "Coach"
  | "SkillCoach"
  | "TacticalCoach"
  | "FitnessCoach"
  | "NutritionSpecialist"
  | "GymCoach"
  | "GoalkeeperCoach"
  | "MentalCoach";

interface PlayerCoachAssignmentAttributes {
  id: string;
  playerId: string;
  coachUserId: string;
  specialty: CoachSpecialty;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlayerCoachAssignmentCreationAttributes extends Optional<
  PlayerCoachAssignmentAttributes,
  "id" | "createdAt" | "updatedAt"
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
  declare specialty: CoachSpecialty;
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
  },
  {
    sequelize,
    tableName: "player_coach_assignments",
    underscored: true,
    timestamps: true,
  },
);

export default PlayerCoachAssignment;
