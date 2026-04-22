// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/developmentProgram.model.ts
// ═══════════════════════════════════════════════════════════════

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { WellnessExercise } from "./fitness.model";

export type ProgramCategory =
  | "strength"
  | "hypertrophy"
  | "cardio"
  | "recovery"
  | "mixed";
export type ProgramPhase =
  | "accumulation"
  | "intensification"
  | "realization"
  | "mixed";
export type ProgramType = "gym" | "field" | "rehab" | "recovery" | "mixed";

// ── DevelopmentProgram ──

interface DevelopmentProgramAttributes {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  category: ProgramCategory;
  estimatedMinutes?: number | null;
  durationWeeks: number;
  phase?: ProgramPhase | null;
  programType: ProgramType;
  trainingBlockId?: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DevelopmentProgramCreation extends Optional<
  DevelopmentProgramAttributes,
  | "id"
  | "isActive"
  | "durationWeeks"
  | "programType"
  | "createdAt"
  | "updatedAt"
> {}

export class DevelopmentProgram
  extends Model<DevelopmentProgramAttributes, DevelopmentProgramCreation>
  implements DevelopmentProgramAttributes
{
  declare id: string;
  declare name: string;
  declare nameAr: string | null;
  declare description: string | null;
  declare category: ProgramCategory;
  declare estimatedMinutes: number | null;
  declare durationWeeks: number;
  declare phase: ProgramPhase | null;
  declare programType: ProgramType;
  declare trainingBlockId: string | null;
  declare isActive: boolean;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // associations
  declare exercises?: ProgramExercise[];
}

DevelopmentProgram.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), field: "name_ar" },
    description: { type: DataTypes.TEXT },
    category: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "strength",
      validate: {
        isIn: [["strength", "hypertrophy", "cardio", "recovery", "mixed"]],
      },
    },
    estimatedMinutes: { type: DataTypes.INTEGER, field: "estimated_minutes" },
    durationWeeks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
      field: "duration_weeks",
      validate: { min: 1, max: 16 },
    },
    phase: {
      type: DataTypes.STRING(30),
      field: "phase",
      validate: {
        isIn: [
          ["accumulation", "intensification", "realization", "mixed", null],
        ],
      },
    },
    programType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "gym",
      field: "program_type",
      validate: { isIn: [["gym", "field", "rehab", "recovery", "mixed"]] },
    },
    trainingBlockId: {
      type: DataTypes.UUID,
      field: "training_block_id",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "development_programs",
    underscored: true,
    timestamps: true,
  },
);

// ── ProgramExercise ──

interface ProgramExerciseAttributes {
  id: string;
  programId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  targetWeightKg?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  createdAt?: Date;
}

interface ProgramExerciseCreation extends Optional<
  ProgramExerciseAttributes,
  "id" | "orderIndex" | "targetSets" | "targetReps" | "createdAt"
> {}

export class ProgramExercise
  extends Model<ProgramExerciseAttributes, ProgramExerciseCreation>
  implements ProgramExerciseAttributes
{
  declare id: string;
  declare programId: string;
  declare exerciseId: string;
  declare orderIndex: number;
  declare targetSets: number;
  declare targetReps: string;
  declare targetWeightKg: number | null;
  declare restSeconds: number | null;
  declare notes: string | null;
}

ProgramExercise.init(
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
    exerciseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "exercise_id",
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "order_index",
    },
    targetSets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      field: "target_sets",
    },
    targetReps: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "8-12",
      field: "target_reps",
    },
    targetWeightKg: {
      type: DataTypes.DECIMAL(6, 1),
      field: "target_weight_kg",
    },
    restSeconds: {
      type: DataTypes.INTEGER,
      defaultValue: 90,
      field: "rest_seconds",
    },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "program_exercises",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ── Associations ──

DevelopmentProgram.hasMany(ProgramExercise, {
  foreignKey: "programId",
  as: "exercises",
  onDelete: "CASCADE",
});
ProgramExercise.belongsTo(DevelopmentProgram, {
  foreignKey: "programId",
  as: "program",
});
ProgramExercise.belongsTo(WellnessExercise, {
  foreignKey: "exerciseId",
  as: "exercise",
});
