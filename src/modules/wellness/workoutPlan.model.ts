import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type WorkoutGoal =
  | "strength"
  | "hypertrophy"
  | "cardio"
  | "recovery"
  | "rehab";
export type WorkoutPlanStatus = "draft" | "active" | "completed" | "archived";
export type WorkoutSessionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export interface PhaseRule {
  weekStart: number;
  weekEnd: number;
  weightDeltaKg?: number;
  repsDelta?: number;
  restDeltaSeconds?: number;
  label?: string;
}

// ── WorkoutPlan ──

interface WorkoutPlanAttributes {
  id: string;
  playerId?: string | null;
  name: string;
  nameAr?: string | null;
  goal: WorkoutGoal;
  startDate: string;
  durationWeeks: number;
  status: WorkoutPlanStatus;
  phaseConfig?: PhaseRule[] | null;
  notes?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WorkoutPlanCreation extends Optional<
  WorkoutPlanAttributes,
  "id" | "status" | "createdAt" | "updatedAt"
> {}

export class WorkoutPlan
  extends Model<WorkoutPlanAttributes, WorkoutPlanCreation>
  implements WorkoutPlanAttributes
{
  declare id: string;
  declare playerId: string | null;
  declare name: string;
  declare nameAr: string | null;
  declare goal: WorkoutGoal;
  declare startDate: string;
  declare durationWeeks: number;
  declare status: WorkoutPlanStatus;
  declare phaseConfig: PhaseRule[] | null;
  declare notes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

WorkoutPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: true, field: "player_id" },
    name: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: true, field: "name_ar" },
    goal: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "strength",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },
    durationWeeks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
      field: "duration_weeks",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "draft",
    },
    phaseConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "phase_config",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: "created_by" },
  },
  {
    sequelize,
    tableName: "workout_plans",
    underscored: true,
    timestamps: true,
  },
);

// ── WorkoutPlanDay ──

interface WorkoutPlanDayAttributes {
  id: string;
  planId: string;
  dayOfWeek: number;
  isRest: boolean;
  label?: string | null;
  createdAt?: Date;
}

interface WorkoutPlanDayCreation extends Optional<
  WorkoutPlanDayAttributes,
  "id" | "isRest" | "createdAt"
> {}

export class WorkoutPlanDay
  extends Model<WorkoutPlanDayAttributes, WorkoutPlanDayCreation>
  implements WorkoutPlanDayAttributes
{
  declare id: string;
  declare planId: string;
  declare dayOfWeek: number;
  declare isRest: boolean;
  declare label: string | null;
  declare readonly createdAt: Date;
}

WorkoutPlanDay.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planId: { type: DataTypes.UUID, allowNull: false, field: "plan_id" },
    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "day_of_week",
    },
    isRest: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_rest",
    },
    label: { type: DataTypes.STRING(100), allowNull: true },
  },
  {
    sequelize,
    tableName: "workout_plan_days",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ── WorkoutPlanExercise ──

interface WorkoutPlanExerciseAttributes {
  id: string;
  planDayId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  targetWeightKg?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  createdAt?: Date;
}

interface WorkoutPlanExerciseCreation extends Optional<
  WorkoutPlanExerciseAttributes,
  "id" | "orderIndex" | "targetSets" | "targetReps" | "createdAt"
> {}

export class WorkoutPlanExercise
  extends Model<WorkoutPlanExerciseAttributes, WorkoutPlanExerciseCreation>
  implements WorkoutPlanExerciseAttributes
{
  declare id: string;
  declare planDayId: string;
  declare exerciseId: string;
  declare orderIndex: number;
  declare targetSets: number;
  declare targetReps: string;
  declare targetWeightKg: number | null;
  declare restSeconds: number | null;
  declare notes: string | null;
  declare readonly createdAt: Date;
}

WorkoutPlanExercise.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planDayId: { type: DataTypes.UUID, allowNull: false, field: "plan_day_id" },
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
      allowNull: true,
      field: "target_weight_kg",
    },
    restSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 90,
      field: "rest_seconds",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "workout_plan_exercises",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ── WorkoutSession ──

interface WorkoutSessionAttributes {
  id: string;
  planId: string;
  planDayId: string;
  playerId: string;
  scheduledDate: string;
  status: WorkoutSessionStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  durationMin?: number | null;
  playerNotes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WorkoutSessionCreation extends Optional<
  WorkoutSessionAttributes,
  | "id"
  | "status"
  | "startedAt"
  | "completedAt"
  | "durationMin"
  | "playerNotes"
  | "createdAt"
  | "updatedAt"
> {}

export class WorkoutSession
  extends Model<WorkoutSessionAttributes, WorkoutSessionCreation>
  implements WorkoutSessionAttributes
{
  declare id: string;
  declare planId: string;
  declare planDayId: string;
  declare playerId: string;
  declare scheduledDate: string;
  declare status: WorkoutSessionStatus;
  declare startedAt: Date | null;
  declare completedAt: Date | null;
  declare durationMin: number | null;
  declare playerNotes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

WorkoutSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planId: { type: DataTypes.UUID, allowNull: false, field: "plan_id" },
    planDayId: { type: DataTypes.UUID, allowNull: false, field: "plan_day_id" },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    scheduledDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "scheduled_date",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    startedAt: { type: DataTypes.DATE, allowNull: true, field: "started_at" },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at",
    },
    durationMin: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "duration_min",
    },
    playerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "player_notes",
    },
  },
  {
    sequelize,
    tableName: "workout_sessions",
    underscored: true,
    timestamps: true,
  },
);

// ── WorkoutSetLog ──

interface WorkoutSetLogAttributes {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  actualReps?: number | null;
  actualWeightKg?: number | null;
  rpe?: number | null;
  notes?: string | null;
  loggedAt: Date;
  createdAt?: Date;
}

interface WorkoutSetLogCreation extends Optional<
  WorkoutSetLogAttributes,
  "id" | "createdAt"
> {}

export class WorkoutSetLog
  extends Model<WorkoutSetLogAttributes, WorkoutSetLogCreation>
  implements WorkoutSetLogAttributes
{
  declare id: string;
  declare sessionId: string;
  declare exerciseId: string;
  declare setNumber: number;
  declare actualReps: number | null;
  declare actualWeightKg: number | null;
  declare rpe: number | null;
  declare notes: string | null;
  declare loggedAt: Date;
  declare readonly createdAt: Date;
}

WorkoutSetLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: { type: DataTypes.UUID, allowNull: false, field: "session_id" },
    exerciseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "exercise_id",
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
      type: DataTypes.DECIMAL(6, 1),
      allowNull: true,
      field: "actual_weight_kg",
    },
    rpe: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    loggedAt: { type: DataTypes.DATE, allowNull: false, field: "logged_at" },
  },
  {
    sequelize,
    tableName: "workout_set_logs",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ── Intra-module associations ──

WorkoutPlan.hasMany(WorkoutPlanDay, { foreignKey: "plan_id", as: "days" });
WorkoutPlanDay.belongsTo(WorkoutPlan, { foreignKey: "plan_id", as: "plan" });

WorkoutPlanDay.hasMany(WorkoutPlanExercise, {
  foreignKey: "plan_day_id",
  as: "exercises",
});
WorkoutPlanExercise.belongsTo(WorkoutPlanDay, {
  foreignKey: "plan_day_id",
  as: "day",
});

WorkoutPlan.hasMany(WorkoutSession, { foreignKey: "plan_id", as: "sessions" });
WorkoutSession.belongsTo(WorkoutPlan, { foreignKey: "plan_id", as: "plan" });

WorkoutSession.hasMany(WorkoutSetLog, {
  foreignKey: "session_id",
  as: "setLogs",
});
WorkoutSetLog.belongsTo(WorkoutSession, {
  foreignKey: "session_id",
  as: "session",
});
