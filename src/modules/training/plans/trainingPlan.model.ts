import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";

export type PlanStatus = "draft" | "active" | "completed" | "archived";
export type PlanPeriodType =
  | "pre-season"
  | "in-season"
  | "off-season"
  | "rehab";
export type WeekIntensity = "low" | "moderate" | "high" | "peak" | "recovery";

// ── TrainingPlan ──

interface TrainingPlanAttributes {
  id: string;
  playerId: string;
  title: string;
  titleAr: string | null;
  position: string | null;
  periodType: PlanPeriodType;
  startDate: string;
  endDate: string;
  weeklyHours: number | null;
  goals: Record<string, unknown>;
  status: PlanStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TrainingPlanCreation extends Optional<
  TrainingPlanAttributes,
  | "id"
  | "titleAr"
  | "position"
  | "weeklyHours"
  | "goals"
  | "status"
  | "notes"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class TrainingPlan
  extends Model<TrainingPlanAttributes, TrainingPlanCreation>
  implements TrainingPlanAttributes
{
  declare id: string;
  declare playerId: string;
  declare title: string;
  declare titleAr: string | null;
  declare position: string | null;
  declare periodType: PlanPeriodType;
  declare startDate: string;
  declare endDate: string;
  declare weeklyHours: number | null;
  declare goals: Record<string, unknown>;
  declare status: PlanStatus;
  declare notes: string | null;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare player?: Player;
  declare creator?: User;
  declare weeks?: TrainingPlanWeek[];
}

TrainingPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    title: { type: DataTypes.STRING(255), allowNull: false },
    titleAr: { type: DataTypes.STRING(255), field: "title_ar" },
    position: { type: DataTypes.STRING(50) },
    periodType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "in-season",
      field: "period_type",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: "end_date" },
    weeklyHours: { type: DataTypes.DECIMAL(4, 1), field: "weekly_hours" },
    goals: { type: DataTypes.JSONB, defaultValue: {} },
    status: { type: DataTypes.STRING(20), defaultValue: "active" },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "training_plans",
    underscored: true,
    timestamps: true,
  },
);

// ── TrainingPlanWeek ──

interface TrainingPlanWeekAttributes {
  id: string;
  planId: string;
  weekNumber: number;
  theme: string | null;
  themeAr: string | null;
  intensity: WeekIntensity;
  workoutTemplateIds: string[];
  sessionIds: string[];
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TrainingPlanWeekCreation extends Optional<
  TrainingPlanWeekAttributes,
  | "id"
  | "theme"
  | "themeAr"
  | "workoutTemplateIds"
  | "sessionIds"
  | "notes"
  | "createdAt"
  | "updatedAt"
> {}

export class TrainingPlanWeek
  extends Model<TrainingPlanWeekAttributes, TrainingPlanWeekCreation>
  implements TrainingPlanWeekAttributes
{
  declare id: string;
  declare planId: string;
  declare weekNumber: number;
  declare theme: string | null;
  declare themeAr: string | null;
  declare intensity: WeekIntensity;
  declare workoutTemplateIds: string[];
  declare sessionIds: string[];
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TrainingPlanWeek.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planId: { type: DataTypes.UUID, allowNull: false, field: "plan_id" },
    weekNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "week_number",
    },
    theme: { type: DataTypes.STRING(255) },
    themeAr: { type: DataTypes.STRING(255), field: "theme_ar" },
    intensity: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "moderate",
    },
    workoutTemplateIds: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      field: "workout_template_ids",
    },
    sessionIds: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      field: "session_ids",
    },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "training_plan_weeks",
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ["plan_id", "week_number"] }],
  },
);

// ── TrainingPlanProgress ──

interface TrainingPlanProgressAttributes {
  id: string;
  planId: string;
  weekNumber: number;
  completionPct: number;
  coachNotes: string | null;
  playerFeedback: string | null;
  adjustmentsMade: string | null;
  loggedDate: string;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TrainingPlanProgressCreation extends Optional<
  TrainingPlanProgressAttributes,
  | "id"
  | "completionPct"
  | "coachNotes"
  | "playerFeedback"
  | "adjustmentsMade"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class TrainingPlanProgress
  extends Model<TrainingPlanProgressAttributes, TrainingPlanProgressCreation>
  implements TrainingPlanProgressAttributes
{
  declare id: string;
  declare planId: string;
  declare weekNumber: number;
  declare completionPct: number;
  declare coachNotes: string | null;
  declare playerFeedback: string | null;
  declare adjustmentsMade: string | null;
  declare loggedDate: string;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TrainingPlanProgress.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planId: { type: DataTypes.UUID, allowNull: false, field: "plan_id" },
    weekNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "week_number",
    },
    completionPct: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: "completion_pct",
    },
    coachNotes: { type: DataTypes.TEXT, field: "coach_notes" },
    playerFeedback: { type: DataTypes.TEXT, field: "player_feedback" },
    adjustmentsMade: { type: DataTypes.TEXT, field: "adjustments_made" },
    loggedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "logged_date",
    },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "training_plan_progress",
    underscored: true,
    timestamps: true,
  },
);

// ── Inline associations ──
TrainingPlan.belongsTo(Player, { foreignKey: "playerId", as: "player" });
Player.hasMany(TrainingPlan, { foreignKey: "playerId", as: "trainingPlans" });

TrainingPlan.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

TrainingPlan.hasMany(TrainingPlanWeek, {
  foreignKey: "planId",
  as: "weeks",
  onDelete: "CASCADE",
});
TrainingPlanWeek.belongsTo(TrainingPlan, { foreignKey: "planId", as: "plan" });

TrainingPlan.hasMany(TrainingPlanProgress, {
  foreignKey: "planId",
  as: "progressLogs",
  onDelete: "CASCADE",
});
TrainingPlanProgress.belongsTo(TrainingPlan, {
  foreignKey: "planId",
  as: "plan",
});
