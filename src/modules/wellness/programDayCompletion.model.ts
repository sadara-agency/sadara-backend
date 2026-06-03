import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface ProgramDayCompletionAttributes {
  id: string;
  playerId: string;
  daySessionId: string;
  programId: string;
  completedDate: string; // DATEONLY → yyyy-mm-dd
  completedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProgramDayCompletionCreation extends Optional<
  ProgramDayCompletionAttributes,
  "id" | "completedAt" | "createdAt" | "updatedAt"
> {}

export class ProgramDayCompletion
  extends Model<ProgramDayCompletionAttributes, ProgramDayCompletionCreation>
  implements ProgramDayCompletionAttributes
{
  declare id: string;
  declare playerId: string;
  declare daySessionId: string;
  declare programId: string;
  declare completedDate: string;
  declare completedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProgramDayCompletion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    daySessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "day_session_id",
    },
    programId: { type: DataTypes.UUID, allowNull: false, field: "program_id" },
    completedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "completed_date",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "completed_at",
    },
  },
  {
    sequelize,
    tableName: "program_day_completions",
    underscored: true,
    timestamps: true,
  },
);
