import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface ProgramExerciseLogAttributes {
  id: string;
  programExerciseId: string;
  programId: string;
  playerId: string;
  setNumber: number;
  actualReps?: number | null;
  actualWeightKg?: number | null;
  rpe?: number | null;
  loggedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProgramExerciseLogCreation extends Optional<
  ProgramExerciseLogAttributes,
  "id" | "loggedAt" | "createdAt" | "updatedAt"
> {}

export class ProgramExerciseLog
  extends Model<ProgramExerciseLogAttributes, ProgramExerciseLogCreation>
  implements ProgramExerciseLogAttributes
{
  declare id: string;
  declare programExerciseId: string;
  declare programId: string;
  declare playerId: string;
  declare setNumber: number;
  declare actualReps: number | null;
  declare actualWeightKg: number | null;
  declare rpe: number | null;
  declare loggedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProgramExerciseLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    programExerciseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "program_exercise_id",
    },
    programId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "program_id",
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "player_id",
    },
    setNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "set_number",
    },
    actualReps: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "actual_reps",
    },
    actualWeightKg: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: "actual_weight_kg",
    },
    rpe: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
    },
    loggedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "logged_at",
    },
  },
  {
    sequelize,
    tableName: "program_exercise_logs",
    underscored: true,
    timestamps: true,
  },
);

export default ProgramExerciseLog;
