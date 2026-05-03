// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/fitness.model.ts
//
// Sequelize models for Phase 3: Fitness
// ═══════════════════════════════════════════════════════════════

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Exercise ──

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "full_body"
  | "cardio"
  | "other";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "cardio_machine"
  | "other"
  | "none";

interface ExerciseAttributes {
  id: string;
  name: string;
  nameAr?: string | null;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  videoUrl?: string | null;
  videoThumbnail?: string | null;
  photoUrl?: string | null;
  instructions?: string | null;
  instructionsAr?: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExerciseCreation extends Optional<
  ExerciseAttributes,
  "id" | "equipment" | "isActive" | "createdAt" | "updatedAt"
> {}

export class WellnessExercise
  extends Model<ExerciseAttributes, ExerciseCreation>
  implements ExerciseAttributes
{
  declare id: string;
  declare name: string;
  declare nameAr: string | null;
  declare muscleGroup: MuscleGroup;
  declare equipment: Equipment;
  declare videoUrl: string | null;
  declare videoThumbnail: string | null;
  declare photoUrl: string | null;
  declare instructions: string | null;
  declare instructionsAr: string | null;
  declare isActive: boolean;
  declare createdBy: string;
}

WellnessExercise.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), field: "name_ar" },
    muscleGroup: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "muscle_group",
    },
    equipment: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "none",
    },
    videoUrl: { type: DataTypes.STRING(500), field: "video_url" },
    videoThumbnail: { type: DataTypes.STRING(500), field: "video_thumbnail" },
    photoUrl: { type: DataTypes.STRING(500), field: "photo_url" },
    instructions: { type: DataTypes.TEXT },
    instructionsAr: { type: DataTypes.TEXT, field: "instructions_ar" },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: "created_by" },
  },
  {
    sequelize,
    tableName: "wellness_exercises",
    underscored: true,
    timestamps: true,
  },
);

// ── Workout Template ──

export type WorkoutCategory =
  | "strength"
  | "hypertrophy"
  | "cardio"
  | "recovery"
  | "mixed";

interface TemplateAttributes {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  category: WorkoutCategory;
  estimatedMinutes?: number | null;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TemplateCreation extends Optional<
  TemplateAttributes,
  "id" | "category" | "isActive" | "createdAt" | "updatedAt"
> {}

export class WellnessWorkoutTemplate
  extends Model<TemplateAttributes, TemplateCreation>
  implements TemplateAttributes
{
  declare id: string;
  declare name: string;
  declare nameAr: string | null;
  declare description: string | null;
  declare category: WorkoutCategory;
  declare estimatedMinutes: number | null;
  declare isActive: boolean;
  declare createdBy: string;
}

WellnessWorkoutTemplate.init(
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
    },
    estimatedMinutes: { type: DataTypes.INTEGER, field: "estimated_minutes" },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: "created_by" },
  },
  {
    sequelize,
    tableName: "wellness_workout_templates",
    underscored: true,
    timestamps: true,
  },
);

// ── Template Exercise (junction with ordering) ──

interface TemplateExerciseAttributes {
  id: string;
  templateId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  targetWeightKg?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  createdAt?: Date;
}

interface TemplateExerciseCreation extends Optional<
  TemplateExerciseAttributes,
  "id" | "orderIndex" | "targetSets" | "targetReps" | "createdAt"
> {}

export class WellnessTemplateExercise
  extends Model<TemplateExerciseAttributes, TemplateExerciseCreation>
  implements TemplateExerciseAttributes
{
  declare id: string;
  declare templateId: string;
  declare exerciseId: string;
  declare orderIndex: number;
  declare targetSets: number;
  declare targetReps: string;
  declare targetWeightKg: number | null;
  declare restSeconds: number | null;
  declare notes: string | null;
}

WellnessTemplateExercise.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "template_id",
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
    tableName: "wellness_template_exercises",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ── Workout Assignment ──

export type AssignmentStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

interface AssignmentAttributes {
  id: string;
  playerId: string;
  templateId: string;
  assignedDate: string;
  status: AssignmentStatus;
  completedAt?: Date | null;
  assignedBy: string;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AssignmentCreation extends Optional<
  AssignmentAttributes,
  "id" | "status" | "createdAt" | "updatedAt"
> {}

export class WellnessWorkoutAssignment
  extends Model<AssignmentAttributes, AssignmentCreation>
  implements AssignmentAttributes
{
  declare id: string;
  declare playerId: string;
  declare templateId: string;
  declare assignedDate: string;
  declare status: AssignmentStatus;
  declare completedAt: Date | null;
  declare assignedBy: string;
  declare notes: string | null;
}

WellnessWorkoutAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "template_id",
    },
    assignedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "assigned_date",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
      validate: { isIn: [["pending", "in_progress", "completed", "skipped"]] },
    },
    completedAt: { type: DataTypes.DATE, field: "completed_at" },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "assigned_by",
    },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "wellness_workout_assignments",
    underscored: true,
    timestamps: true,
  },
);

// ── Daily Summary ──

interface DailySummaryAttributes {
  id: string;
  playerId: string;
  summaryDate: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  calorieAdherencePct?: number | null;
  proteinAdherencePct?: number | null;
  workoutCompleted: boolean;
  weightLogged: boolean;
  ringScore: number;
  readinessScore?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DailySummaryCreation extends Optional<
  DailySummaryAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class WellnessDailySummary
  extends Model<DailySummaryAttributes, DailySummaryCreation>
  implements DailySummaryAttributes
{
  declare id: string;
  declare playerId: string;
  declare summaryDate: string;
  declare totalCalories: number;
  declare totalProteinG: number;
  declare totalCarbsG: number;
  declare totalFatG: number;
  declare calorieAdherencePct: number | null;
  declare proteinAdherencePct: number | null;
  declare workoutCompleted: boolean;
  declare weightLogged: boolean;
  declare ringScore: number;
  declare readinessScore: number | null;
}

WellnessDailySummary.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    summaryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "summary_date",
    },
    totalCalories: {
      type: DataTypes.DECIMAL(8, 1),
      defaultValue: 0,
      field: "total_calories",
    },
    totalProteinG: {
      type: DataTypes.DECIMAL(8, 1),
      defaultValue: 0,
      field: "total_protein_g",
    },
    totalCarbsG: {
      type: DataTypes.DECIMAL(8, 1),
      defaultValue: 0,
      field: "total_carbs_g",
    },
    totalFatG: {
      type: DataTypes.DECIMAL(8, 1),
      defaultValue: 0,
      field: "total_fat_g",
    },
    calorieAdherencePct: {
      type: DataTypes.INTEGER,
      field: "calorie_adherence_pct",
    },
    proteinAdherencePct: {
      type: DataTypes.INTEGER,
      field: "protein_adherence_pct",
    },
    workoutCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "workout_completed",
    },
    weightLogged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "weight_logged",
    },
    ringScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "ring_score",
    },
    readinessScore: {
      type: DataTypes.INTEGER,
      field: "readiness_score",
    },
  },
  {
    sequelize,
    tableName: "wellness_daily_summaries",
    underscored: true,
    timestamps: true,
  },
);

// ── Associations ──

WellnessWorkoutTemplate.hasMany(WellnessTemplateExercise, {
  foreignKey: "template_id",
  as: "exercises",
});
WellnessTemplateExercise.belongsTo(WellnessWorkoutTemplate, {
  foreignKey: "template_id",
  as: "template",
});
WellnessTemplateExercise.belongsTo(WellnessExercise, {
  foreignKey: "exercise_id",
  as: "exercise",
});

WellnessWorkoutAssignment.belongsTo(WellnessWorkoutTemplate, {
  foreignKey: "template_id",
  as: "template",
});
