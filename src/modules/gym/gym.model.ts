import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ═══════════════════════════════════════════
// Exercise Library
// ═══════════════════════════════════════════

interface ExerciseLibraryAttributes {
  id: string;
  nameEn: string;
  nameAr?: string | null;
  muscleGroup: string;
  secondaryMuscles?: string | null;
  equipment?: string | null;
  movementType?: string | null;
  difficulty: string;
  mediaUrl?: string | null;
  instructions?: string | null;
  instructionsAr?: string | null;
  isCustom: boolean;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExerciseLibraryCreation extends Optional<
  ExerciseLibraryAttributes,
  "id" | "difficulty" | "isCustom" | "createdAt" | "updatedAt"
> {}

export class ExerciseLibrary
  extends Model<ExerciseLibraryAttributes, ExerciseLibraryCreation>
  implements ExerciseLibraryAttributes
{
  declare id: string;
  declare nameEn: string;
  declare nameAr: string | null;
  declare muscleGroup: string;
  declare secondaryMuscles: string | null;
  declare equipment: string | null;
  declare movementType: string | null;
  declare difficulty: string;
  declare mediaUrl: string | null;
  declare instructions: string | null;
  declare instructionsAr: string | null;
  declare isCustom: boolean;
  declare createdBy: string | null;
}

ExerciseLibrary.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nameEn: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
      field: "name_en",
    },
    nameAr: { type: DataTypes.STRING(200), field: "name_ar" },
    muscleGroup: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "muscle_group",
    },
    secondaryMuscles: { type: DataTypes.TEXT, field: "secondary_muscles" },
    equipment: { type: DataTypes.STRING(50) },
    movementType: { type: DataTypes.STRING(50), field: "movement_type" },
    difficulty: { type: DataTypes.STRING(20), defaultValue: "Intermediate" },
    mediaUrl: { type: DataTypes.STRING(500), field: "media_url" },
    instructions: { type: DataTypes.TEXT },
    instructionsAr: { type: DataTypes.TEXT, field: "instructions_ar" },
    isCustom: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_custom",
    },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "exercise_library",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════════
// Body Metrics
// ═══════════════════════════════════════════

interface BodyMetricAttributes {
  id: string;
  playerId: string;
  recordedBy?: string | null;
  date: string;
  weight?: number | null;
  height?: number | null;
  bodyFatPct?: number | null;
  muscleMass?: number | null;
  bmi?: number | null;
  chest?: number | null;
  waist?: number | null;
  arms?: number | null;
  thighs?: number | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BodyMetricCreation extends Optional<
  BodyMetricAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class BodyMetric
  extends Model<BodyMetricAttributes, BodyMetricCreation>
  implements BodyMetricAttributes
{
  declare id: string;
  declare playerId: string;
  declare recordedBy: string | null;
  declare date: string;
  declare weight: number | null;
  declare height: number | null;
  declare bodyFatPct: number | null;
  declare muscleMass: number | null;
  declare bmi: number | null;
  declare chest: number | null;
  declare waist: number | null;
  declare arms: number | null;
  declare thighs: number | null;
  declare notes: string | null;
}

BodyMetric.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    recordedBy: { type: DataTypes.UUID, field: "recorded_by" },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    weight: { type: DataTypes.DECIMAL(5, 2) },
    height: { type: DataTypes.DECIMAL(5, 2) },
    bodyFatPct: { type: DataTypes.DECIMAL(4, 1), field: "body_fat_pct" },
    muscleMass: { type: DataTypes.DECIMAL(5, 2), field: "muscle_mass" },
    bmi: { type: DataTypes.DECIMAL(4, 1) },
    chest: { type: DataTypes.DECIMAL(5, 1) },
    waist: { type: DataTypes.DECIMAL(5, 1) },
    arms: { type: DataTypes.DECIMAL(5, 1) },
    thighs: { type: DataTypes.DECIMAL(5, 1) },
    notes: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "body_metrics", underscored: true, timestamps: true },
);

// ═══════════════════════════════════════════
// Metric Targets
// ═══════════════════════════════════════════

interface MetricTargetAttributes {
  id: string;
  playerId: string;
  setBy?: string | null;
  targetWeight?: number | null;
  targetBodyFat?: number | null;
  targetMuscleMass?: number | null;
  deadline?: string | null;
  status: string;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MetricTargetCreation extends Optional<
  MetricTargetAttributes,
  "id" | "status" | "createdAt" | "updatedAt"
> {}

export class MetricTarget
  extends Model<MetricTargetAttributes, MetricTargetCreation>
  implements MetricTargetAttributes
{
  declare id: string;
  declare playerId: string;
  declare setBy: string | null;
  declare targetWeight: number | null;
  declare targetBodyFat: number | null;
  declare targetMuscleMass: number | null;
  declare deadline: string | null;
  declare status: string;
  declare notes: string | null;
}

MetricTarget.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    setBy: { type: DataTypes.UUID, field: "set_by" },
    targetWeight: { type: DataTypes.DECIMAL(5, 2), field: "target_weight" },
    targetBodyFat: { type: DataTypes.DECIMAL(4, 1), field: "target_body_fat" },
    targetMuscleMass: {
      type: DataTypes.DECIMAL(5, 2),
      field: "target_muscle_mass",
    },
    deadline: { type: DataTypes.DATEONLY },
    status: { type: DataTypes.STRING(20), defaultValue: "active" },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "metric_targets",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════════
// BMR Calculations
// ═══════════════════════════════════════════

interface BmrCalculationAttributes {
  id: string;
  playerId: string;
  calculatedBy?: string | null;
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  bmr: number;
  tdee: number;
  goal: string;
  targetCalories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  createdAt?: Date;
}

interface BmrCalculationCreation extends Optional<
  BmrCalculationAttributes,
  "id" | "gender" | "activityLevel" | "goal" | "createdAt"
> {}

export class BmrCalculation
  extends Model<BmrCalculationAttributes, BmrCalculationCreation>
  implements BmrCalculationAttributes
{
  declare id: string;
  declare playerId: string;
  declare calculatedBy: string | null;
  declare weight: number;
  declare height: number;
  declare age: number;
  declare gender: string;
  declare activityLevel: string;
  declare bmr: number;
  declare tdee: number;
  declare goal: string;
  declare targetCalories: number | null;
  declare proteinG: number | null;
  declare carbsG: number | null;
  declare fatG: number | null;
}

BmrCalculation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    calculatedBy: { type: DataTypes.UUID, field: "calculated_by" },
    weight: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    height: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    age: { type: DataTypes.INTEGER, allowNull: false },
    gender: { type: DataTypes.STRING(10), defaultValue: "male" },
    activityLevel: {
      type: DataTypes.STRING(20),
      defaultValue: "moderate",
      field: "activity_level",
    },
    bmr: { type: DataTypes.DECIMAL(7, 1), allowNull: false },
    tdee: { type: DataTypes.DECIMAL(7, 1), allowNull: false },
    goal: { type: DataTypes.STRING(20), defaultValue: "maintain" },
    targetCalories: { type: DataTypes.DECIMAL(7, 1), field: "target_calories" },
    proteinG: { type: DataTypes.DECIMAL(5, 1), field: "protein_g" },
    carbsG: { type: DataTypes.DECIMAL(5, 1), field: "carbs_g" },
    fatG: { type: DataTypes.DECIMAL(5, 1), field: "fat_g" },
  },
  {
    sequelize,
    tableName: "bmr_calculations",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ═══════════════════════════════════════════
// Workout Plans
// ═══════════════════════════════════════════

interface WorkoutPlanAttributes {
  id: string;
  nameEn: string;
  nameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  type: string;
  status: string;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WorkoutPlanCreation extends Optional<
  WorkoutPlanAttributes,
  | "id"
  | "durationWeeks"
  | "daysPerWeek"
  | "type"
  | "status"
  | "createdAt"
  | "updatedAt"
> {}

export class WorkoutPlan
  extends Model<WorkoutPlanAttributes, WorkoutPlanCreation>
  implements WorkoutPlanAttributes
{
  declare id: string;
  declare nameEn: string;
  declare nameAr: string | null;
  declare description: string | null;
  declare descriptionAr: string | null;
  declare durationWeeks: number;
  declare daysPerWeek: number;
  declare type: string;
  declare status: string;
  declare createdBy: string | null;
  // eager-loaded
  declare sessions?: WorkoutSession[];
}

WorkoutPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nameEn: { type: DataTypes.STRING(200), allowNull: false, field: "name_en" },
    nameAr: { type: DataTypes.STRING(200), field: "name_ar" },
    description: { type: DataTypes.TEXT },
    descriptionAr: { type: DataTypes.TEXT, field: "description_ar" },
    durationWeeks: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
      field: "duration_weeks",
    },
    daysPerWeek: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      field: "days_per_week",
    },
    type: { type: DataTypes.STRING(20), defaultValue: "individual" },
    status: { type: DataTypes.STRING(20), defaultValue: "draft" },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "workout_plans",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════════
// Workout Sessions
// ═══════════════════════════════════════════

interface WorkoutSessionAttributes {
  id: string;
  planId: string;
  weekNumber: number;
  dayNumber: number;
  sessionName?: string | null;
  sessionNameAr?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WorkoutSessionCreation extends Optional<
  WorkoutSessionAttributes,
  "id" | "weekNumber" | "dayNumber" | "createdAt" | "updatedAt"
> {}

export class WorkoutSession
  extends Model<WorkoutSessionAttributes, WorkoutSessionCreation>
  implements WorkoutSessionAttributes
{
  declare id: string;
  declare planId: string;
  declare weekNumber: number;
  declare dayNumber: number;
  declare sessionName: string | null;
  declare sessionNameAr: string | null;
  declare notes: string | null;
  declare exercises?: WorkoutExercise[];
}

WorkoutSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planId: { type: DataTypes.UUID, allowNull: false, field: "plan_id" },
    weekNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: "week_number",
    },
    dayNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: "day_number",
    },
    sessionName: { type: DataTypes.STRING(200), field: "session_name" },
    sessionNameAr: { type: DataTypes.STRING(200), field: "session_name_ar" },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "workout_sessions",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════════
// Workout Exercises
// ═══════════════════════════════════════════

interface WorkoutExerciseAttributes {
  id: string;
  sessionId: string;
  exerciseId?: string | null;
  customName?: string | null;
  sets: number;
  reps: string;
  weight?: number | null;
  restSeconds: number;
  tempo?: string | null;
  sortOrder: number;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WorkoutExerciseCreation extends Optional<
  WorkoutExerciseAttributes,
  | "id"
  | "sets"
  | "reps"
  | "restSeconds"
  | "sortOrder"
  | "createdAt"
  | "updatedAt"
> {}

export class WorkoutExercise
  extends Model<WorkoutExerciseAttributes, WorkoutExerciseCreation>
  implements WorkoutExerciseAttributes
{
  declare id: string;
  declare sessionId: string;
  declare exerciseId: string | null;
  declare customName: string | null;
  declare sets: number;
  declare reps: string;
  declare weight: number | null;
  declare restSeconds: number;
  declare tempo: string | null;
  declare sortOrder: number;
  declare notes: string | null;
  declare exercise?: ExerciseLibrary;
}

WorkoutExercise.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: { type: DataTypes.UUID, allowNull: false, field: "session_id" },
    exerciseId: { type: DataTypes.UUID, field: "exercise_id" },
    customName: { type: DataTypes.STRING(200), field: "custom_name" },
    sets: { type: DataTypes.INTEGER, defaultValue: 3 },
    reps: { type: DataTypes.STRING(20), defaultValue: "10" },
    weight: { type: DataTypes.DECIMAL(5, 1) },
    restSeconds: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      field: "rest_seconds",
    },
    tempo: { type: DataTypes.STRING(20) },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "workout_exercises",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════════
// Workout Assignments
// ═══════════════════════════════════════════

interface WorkoutAssignmentAttributes {
  id: string;
  planId: string;
  playerId: string;
  assignedBy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  completionPct: number;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WorkoutAssignmentCreation extends Optional<
  WorkoutAssignmentAttributes,
  "id" | "status" | "completionPct" | "createdAt" | "updatedAt"
> {}

export class WorkoutAssignment
  extends Model<WorkoutAssignmentAttributes, WorkoutAssignmentCreation>
  implements WorkoutAssignmentAttributes
{
  declare id: string;
  declare planId: string;
  declare playerId: string;
  declare assignedBy: string | null;
  declare startDate: string | null;
  declare endDate: string | null;
  declare status: string;
  declare completionPct: number;
  declare notes: string | null;
}

WorkoutAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planId: { type: DataTypes.UUID, allowNull: false, field: "plan_id" },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    assignedBy: { type: DataTypes.UUID, field: "assigned_by" },
    startDate: { type: DataTypes.DATEONLY, field: "start_date" },
    endDate: { type: DataTypes.DATEONLY, field: "end_date" },
    status: { type: DataTypes.STRING(20), defaultValue: "active" },
    completionPct: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "completion_pct",
    },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "workout_assignments",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════════
// Workout Logs
// ═══════════════════════════════════════════

interface WorkoutLogAttributes {
  id: string;
  assignmentId: string;
  sessionId: string;
  playerId: string;
  completedAt?: Date;
  actualData?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt?: Date;
}

interface WorkoutLogCreation extends Optional<
  WorkoutLogAttributes,
  "id" | "createdAt"
> {}

export class WorkoutLog
  extends Model<WorkoutLogAttributes, WorkoutLogCreation>
  implements WorkoutLogAttributes
{
  declare id: string;
  declare assignmentId: string;
  declare sessionId: string;
  declare playerId: string;
  declare completedAt: Date;
  declare actualData: Record<string, unknown> | null;
  declare notes: string | null;
}

WorkoutLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    assignmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "assignment_id",
    },
    sessionId: { type: DataTypes.UUID, allowNull: false, field: "session_id" },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    completedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "completed_at",
    },
    actualData: { type: DataTypes.JSONB, field: "actual_data" },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "workout_logs",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ═══════════════════════════════════════════
// Food Database
// ═══════════════════════════════════════════

interface FoodItemAttributes {
  id: string;
  nameEn: string;
  nameAr?: string | null;
  category?: string | null;
  caloriesPer100g?: number | null;
  proteinPer100g?: number | null;
  carbsPer100g?: number | null;
  fatPer100g?: number | null;
  fiberPer100g?: number | null;
  servingSize: number;
  servingUnit: string;
  isCustom: boolean;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FoodItemCreation extends Optional<
  FoodItemAttributes,
  "id" | "servingSize" | "servingUnit" | "isCustom" | "createdAt" | "updatedAt"
> {}

export class FoodItem
  extends Model<FoodItemAttributes, FoodItemCreation>
  implements FoodItemAttributes
{
  declare id: string;
  declare nameEn: string;
  declare nameAr: string | null;
  declare category: string | null;
  declare caloriesPer100g: number | null;
  declare proteinPer100g: number | null;
  declare carbsPer100g: number | null;
  declare fatPer100g: number | null;
  declare fiberPer100g: number | null;
  declare servingSize: number;
  declare servingUnit: string;
  declare isCustom: boolean;
  declare createdBy: string | null;
}

FoodItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nameEn: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
      field: "name_en",
    },
    nameAr: { type: DataTypes.STRING(200), field: "name_ar" },
    category: { type: DataTypes.STRING(50) },
    caloriesPer100g: {
      type: DataTypes.DECIMAL(6, 1),
      field: "calories_per_100g",
    },
    proteinPer100g: {
      type: DataTypes.DECIMAL(5, 1),
      field: "protein_per_100g",
    },
    carbsPer100g: { type: DataTypes.DECIMAL(5, 1), field: "carbs_per_100g" },
    fatPer100g: { type: DataTypes.DECIMAL(5, 1), field: "fat_per_100g" },
    fiberPer100g: { type: DataTypes.DECIMAL(5, 1), field: "fiber_per_100g" },
    servingSize: {
      type: DataTypes.DECIMAL(6, 1),
      defaultValue: 100,
      field: "serving_size",
    },
    servingUnit: {
      type: DataTypes.STRING(20),
      defaultValue: "g",
      field: "serving_unit",
    },
    isCustom: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_custom",
    },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "food_database",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════════
// Diet Plans
// ═══════════════════════════════════════════

interface DietPlanAttributes {
  id: string;
  nameEn: string;
  nameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  type: string;
  targetCalories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  status: string;
  isTemplate: boolean;
  templateTags?: string[] | null;
  playerId?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DietPlanCreation extends Optional<
  DietPlanAttributes,
  "id" | "type" | "status" | "isTemplate" | "createdAt" | "updatedAt"
> {}

export class DietPlan
  extends Model<DietPlanAttributes, DietPlanCreation>
  implements DietPlanAttributes
{
  declare id: string;
  declare nameEn: string;
  declare nameAr: string | null;
  declare description: string | null;
  declare descriptionAr: string | null;
  declare type: string;
  declare targetCalories: number | null;
  declare proteinG: number | null;
  declare carbsG: number | null;
  declare fatG: number | null;
  declare status: string;
  declare isTemplate: boolean;
  declare templateTags: string[] | null;
  declare playerId: string | null;
  declare createdBy: string | null;
  declare meals?: DietMeal[];
}

DietPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nameEn: { type: DataTypes.STRING(200), allowNull: false, field: "name_en" },
    nameAr: { type: DataTypes.STRING(200), field: "name_ar" },
    description: { type: DataTypes.TEXT },
    descriptionAr: { type: DataTypes.TEXT, field: "description_ar" },
    type: { type: DataTypes.STRING(20), defaultValue: "weekly" },
    targetCalories: { type: DataTypes.DECIMAL(7, 1), field: "target_calories" },
    proteinG: { type: DataTypes.DECIMAL(5, 1), field: "protein_g" },
    carbsG: { type: DataTypes.DECIMAL(5, 1), field: "carbs_g" },
    fatG: { type: DataTypes.DECIMAL(5, 1), field: "fat_g" },
    status: { type: DataTypes.STRING(20), defaultValue: "draft" },
    isTemplate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_template",
    },
    templateTags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      field: "template_tags",
    },
    playerId: { type: DataTypes.UUID, field: "player_id" },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  { sequelize, tableName: "diet_plans", underscored: true, timestamps: true },
);

// ═══════════════════════════════════════════
// Diet Meals
// ═══════════════════════════════════════════

interface DietMealAttributes {
  id: string;
  planId: string;
  nameEn?: string | null;
  nameAr?: string | null;
  dayNumber: number;
  mealType: string;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DietMealCreation extends Optional<
  DietMealAttributes,
  "id" | "dayNumber" | "mealType" | "sortOrder" | "createdAt" | "updatedAt"
> {}

export class DietMeal
  extends Model<DietMealAttributes, DietMealCreation>
  implements DietMealAttributes
{
  declare id: string;
  declare planId: string;
  declare nameEn: string | null;
  declare nameAr: string | null;
  declare dayNumber: number;
  declare mealType: string;
  declare sortOrder: number;
  declare items?: DietMealItem[];
}

DietMeal.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planId: { type: DataTypes.UUID, allowNull: false, field: "plan_id" },
    nameEn: { type: DataTypes.STRING(200), field: "name_en" },
    nameAr: { type: DataTypes.STRING(200), field: "name_ar" },
    dayNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: "day_number",
    },
    mealType: {
      type: DataTypes.STRING(20),
      defaultValue: "lunch",
      field: "meal_type",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },
  },
  { sequelize, tableName: "diet_meals", underscored: true, timestamps: true },
);

// ═══════════════════════════════════════════
// Diet Meal Items
// ═══════════════════════════════════════════

interface DietMealItemAttributes {
  id: string;
  mealId: string;
  foodId?: string | null;
  customName?: string | null;
  portionSize: number;
  portionUnit: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DietMealItemCreation extends Optional<
  DietMealItemAttributes,
  "id" | "portionSize" | "portionUnit" | "sortOrder" | "createdAt" | "updatedAt"
> {}

export class DietMealItem
  extends Model<DietMealItemAttributes, DietMealItemCreation>
  implements DietMealItemAttributes
{
  declare id: string;
  declare mealId: string;
  declare foodId: string | null;
  declare customName: string | null;
  declare portionSize: number;
  declare portionUnit: string;
  declare calories: number | null;
  declare protein: number | null;
  declare carbs: number | null;
  declare fat: number | null;
  declare sortOrder: number;
  declare food?: FoodItem;
}

DietMealItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mealId: { type: DataTypes.UUID, allowNull: false, field: "meal_id" },
    foodId: { type: DataTypes.UUID, field: "food_id" },
    customName: { type: DataTypes.STRING(200), field: "custom_name" },
    portionSize: {
      type: DataTypes.DECIMAL(6, 1),
      defaultValue: 100,
      field: "portion_size",
    },
    portionUnit: {
      type: DataTypes.STRING(20),
      defaultValue: "g",
      field: "portion_unit",
    },
    calories: { type: DataTypes.DECIMAL(6, 1) },
    protein: { type: DataTypes.DECIMAL(5, 1) },
    carbs: { type: DataTypes.DECIMAL(5, 1) },
    fat: { type: DataTypes.DECIMAL(5, 1) },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },
  },
  {
    sequelize,
    tableName: "diet_meal_items",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════════
// Diet Adherence
// ═══════════════════════════════════════════

interface DietAdherenceAttributes {
  id: string;
  planId: string;
  playerId: string;
  mealId?: string | null;
  date: string;
  status: string;
  notes?: string | null;
  createdAt?: Date;
}

interface DietAdherenceCreation extends Optional<
  DietAdherenceAttributes,
  "id" | "status" | "createdAt"
> {}

export class DietAdherence
  extends Model<DietAdherenceAttributes, DietAdherenceCreation>
  implements DietAdherenceAttributes
{
  declare id: string;
  declare planId: string;
  declare playerId: string;
  declare mealId: string | null;
  declare date: string;
  declare status: string;
  declare notes: string | null;
}

DietAdherence.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planId: { type: DataTypes.UUID, allowNull: false, field: "plan_id" },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    mealId: { type: DataTypes.UUID, field: "meal_id" },
    date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    status: { type: DataTypes.STRING(20), defaultValue: "ate" },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "diet_adherence",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ═══════════════════════════════════════════
// Coach Alerts
// ═══════════════════════════════════════════

interface CoachAlertAttributes {
  id: string;
  coachId: string;
  playerId?: string | null;
  alertType: string;
  threshold?: number | null;
  message?: string | null;
  isRead: boolean;
  triggeredAt?: Date;
  createdAt?: Date;
}

interface CoachAlertCreation extends Optional<
  CoachAlertAttributes,
  "id" | "isRead" | "createdAt"
> {}

export class CoachAlert
  extends Model<CoachAlertAttributes, CoachAlertCreation>
  implements CoachAlertAttributes
{
  declare id: string;
  declare coachId: string;
  declare playerId: string | null;
  declare alertType: string;
  declare threshold: number | null;
  declare message: string | null;
  declare isRead: boolean;
  declare triggeredAt: Date;
}

CoachAlert.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    coachId: { type: DataTypes.UUID, allowNull: false, field: "coach_id" },
    playerId: { type: DataTypes.UUID, field: "player_id" },
    alertType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "alert_type",
    },
    threshold: { type: DataTypes.DECIMAL(6, 1) },
    message: { type: DataTypes.TEXT },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false, field: "is_read" },
    triggeredAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "triggered_at",
    },
  },
  {
    sequelize,
    tableName: "coach_alerts",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);
