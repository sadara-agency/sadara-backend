import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { ProgramExercise } from "./developmentProgram.model";

interface ProgramDaySessionAttributes {
  id: string;
  programId: string;
  dayOfWeek?: number | null;
  label: string;
  labelAr?: string | null;
  orderIndex: number;
  estimatedMinutes?: number | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProgramDaySessionCreation extends Optional<
  ProgramDaySessionAttributes,
  "id" | "orderIndex" | "createdAt" | "updatedAt"
> {}

export class ProgramDaySession
  extends Model<ProgramDaySessionAttributes, ProgramDaySessionCreation>
  implements ProgramDaySessionAttributes
{
  declare id: string;
  declare programId: string;
  declare dayOfWeek: number | null;
  declare label: string;
  declare labelAr: string | null;
  declare orderIndex: number;
  declare estimatedMinutes: number | null;
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare exercises?: ProgramExercise[];
}

ProgramDaySession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    programId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "program_id",
    },
    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "day_of_week",
      validate: { min: 0, max: 6 },
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    labelAr: {
      type: DataTypes.STRING(100),
      field: "label_ar",
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "order_index",
    },
    estimatedMinutes: {
      type: DataTypes.INTEGER,
      field: "estimated_minutes",
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    tableName: "program_day_sessions",
    underscored: true,
    timestamps: true,
  },
);

// Associations — ProgramExercise side registered here
ProgramDaySession.hasMany(ProgramExercise, {
  foreignKey: "daySessionId",
  as: "exercises",
  onDelete: "SET NULL",
});
ProgramExercise.belongsTo(ProgramDaySession, {
  foreignKey: "daySessionId",
  as: "daySession",
});
