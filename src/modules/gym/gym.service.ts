import { Op, Sequelize } from "sequelize";
import {
  ExerciseLibrary,
  BodyMetric,
  MetricTarget,
  BmrCalculation,
  WorkoutPlan,
  WorkoutSession,
  WorkoutExercise,
  WorkoutAssignment,
  WorkoutLog,
  FoodItem,
  DietPlan,
  DietMeal,
  DietMealItem,
  DietAdherence,
  CoachAlert,
} from "@modules/gym/gym.model";
import { Player } from "@modules/players/player.model";
import { AppError } from "@middleware/errorHandler";
import { generateWorkoutCompletedTask } from "@modules/gym/gymAutoTasks";
import { logger } from "@config/logger";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  findOrThrow,
  destroyById,
  bilingualSearch,
  pickDefined,
  buildDateRange,
} from "@shared/utils/serviceHelpers";
import type {
  CreateExerciseInput,
  UpdateExerciseInput,
  CreateBodyMetricInput,
  UpdateBodyMetricInput,
  CreateMetricTargetInput,
  UpdateMetricTargetInput,
  CalculateBmrInput,
  CreateWorkoutPlanInput,
  UpdateWorkoutPlanInput,
  CreateSessionInput,
  UpdateSessionInput,
  CreateWorkoutExerciseInput,
  AssignWorkoutInput,
  LogWorkoutInput,
  CreateFoodInput,
  UpdateFoodInput,
  CreateDietPlanInput,
  UpdateDietPlanInput,
  CreateDietMealInput,
  LogAdherenceInput,
} from "@modules/gym/gym.schema";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "position",
  "photoUrl",
] as const;

// ═══════════════════════════════════════════
// EXERCISE LIBRARY
// ═══════════════════════════════════════════

export async function listExercises(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "nameEn",
  );

  const where = {
    ...pickDefined(queryParams, ["muscleGroup", "equipment", "difficulty"]),
    ...bilingualSearch(search),
  };

  const { count, rows } = await ExerciseLibrary.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getExercise(id: string) {
  return findOrThrow(ExerciseLibrary, id, "Exercise");
}

export async function createExercise(
  input: CreateExerciseInput,
  createdBy: string,
) {
  return ExerciseLibrary.create({ ...input, isCustom: true, createdBy });
}

export async function updateExercise(id: string, input: UpdateExerciseInput) {
  const exercise = await findOrThrow(ExerciseLibrary, id, "Exercise");
  return exercise.update(input);
}

export async function deleteExercise(id: string) {
  return destroyById(ExerciseLibrary, id, "Exercise");
}

// ═══════════════════════════════════════════
// BODY METRICS
// ═══════════════════════════════════════════

function calculateBmi(weight: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return parseFloat((weight / (heightM * heightM)).toFixed(1));
}

export async function listBodyMetrics(playerId: string, queryParams: any) {
  const { limit, offset, page } = parsePagination(queryParams, "date");

  const dateRange = buildDateRange(queryParams.from, queryParams.to);
  const where: any = { playerId };
  if (dateRange) where.date = dateRange;

  try {
    const { count, rows } = await BodyMetric.findAndCountAll({
      where,
      limit,
      offset,
      order: [["date", "DESC"]],
    });
    return { data: rows, meta: buildMeta(count, page, limit) };
  } catch (err) {
    logger.error("Failed to list body metrics", {
      playerId,
      error: (err as Error).message,
    });
    throw new AppError("Failed to load body metrics", 500);
  }
}

export async function createBodyMetric(
  input: CreateBodyMetricInput,
  recordedBy: string,
) {
  const bmi =
    input.weight && input.height
      ? calculateBmi(input.weight, input.height)
      : undefined;

  return BodyMetric.create({
    ...input,
    date: input.date || new Date().toISOString().split("T")[0],
    recordedBy,
    ...(bmi !== undefined && { bmi }),
  });
}

export async function updateBodyMetric(
  id: string,
  input: UpdateBodyMetricInput,
) {
  const metric = await findOrThrow(BodyMetric, id, "Body metric");
  return metric.update(input);
}

export async function deleteBodyMetric(id: string) {
  return destroyById(BodyMetric, id, "Body metric");
}

export async function getLatestBodyMetric(playerId: string) {
  return BodyMetric.findOne({
    where: { playerId },
    order: [["date", "DESC"]],
  });
}

// ═══════════════════════════════════════════
// METRIC TARGETS
// ═══════════════════════════════════════════

export async function getMetricTarget(playerId: string) {
  return MetricTarget.findOne({
    where: { playerId, status: "active" },
    order: [["createdAt", "DESC"]],
  });
}

export async function createMetricTarget(
  input: CreateMetricTargetInput,
  setBy: string,
) {
  await MetricTarget.update(
    { status: "cancelled" },
    { where: { playerId: input.playerId, status: "active" } },
  );
  return MetricTarget.create({ ...input, setBy });
}

export async function updateMetricTarget(
  id: string,
  input: UpdateMetricTargetInput,
) {
  const target = await findOrThrow(MetricTarget, id, "Metric target");
  return target.update(input);
}

// ═══════════════════════════════════════════
// BMR CALCULATOR
// ═══════════════════════════════════════════

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  extra_active: 1.9,
} as const;

const GOAL_CALORIE_ADJUSTMENTS: Record<string, number> = {
  cut: -500,
  maintain: 0,
  bulk: 300,
} as const;

const MACRO_RATIOS = {
  protein: 0.3,
  fat: 0.25,
} as const;

const CALORIES_PER_GRAM = { protein: 4, fat: 9, carbs: 4 } as const;

function computeBmrMetrics(input: CalculateBmrInput) {
  const genderOffset = input.gender === "male" ? 5 : -161;
  const bmr =
    10 * input.weight + 6.25 * input.height - 5 * input.age + genderOffset;

  const tdee =
    bmr *
    (ACTIVITY_MULTIPLIERS[input.activityLevel] ??
      ACTIVITY_MULTIPLIERS.moderate);
  const targetCalories = tdee + (GOAL_CALORIE_ADJUSTMENTS[input.goal] ?? 0);

  const proteinG =
    (targetCalories * MACRO_RATIOS.protein) / CALORIES_PER_GRAM.protein;
  const fatG = (targetCalories * MACRO_RATIOS.fat) / CALORIES_PER_GRAM.fat;
  const carbsG =
    (targetCalories -
      proteinG * CALORIES_PER_GRAM.protein -
      fatG * CALORIES_PER_GRAM.fat) /
    CALORIES_PER_GRAM.carbs;

  const round = (n: number) => parseFloat(n.toFixed(1));
  return {
    bmr: round(bmr),
    tdee: round(tdee),
    targetCalories: round(targetCalories),
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatG: round(fatG),
  };
}

export async function calculateAndSaveBmr(
  input: CalculateBmrInput,
  calculatedBy: string,
) {
  const metrics = computeBmrMetrics(input);
  return BmrCalculation.create({ ...input, calculatedBy, ...metrics });
}

export async function getBmrHistory(playerId: string) {
  return BmrCalculation.findAll({
    where: { playerId },
    order: [["createdAt", "DESC"]],
    limit: 20,
  });
}

// ═══════════════════════════════════════════
// WORKOUT PLANS
// ═══════════════════════════════════════════

export async function listWorkoutPlans(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );

  const where = {
    ...pickDefined(queryParams, ["status", "type"]),
    ...bilingualSearch(search),
  };

  const { count, rows } = await WorkoutPlan.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    attributes: {
      include: [
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM workout_assignments WHERE workout_assignments.plan_id = "WorkoutPlan".id)`,
          ),
          "assignmentCount",
        ],
      ],
    },
    distinct: true,
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

const WORKOUT_PLAN_INCLUDE = [
  {
    model: WorkoutSession,
    as: "sessions",
    include: [
      {
        model: WorkoutExercise,
        as: "exercises",
        include: [{ model: ExerciseLibrary, as: "exercise" }],
        order: [["sortOrder", "ASC"]],
      },
    ],
    order: [
      ["weekNumber", "ASC"],
      ["dayNumber", "ASC"],
    ],
  },
  {
    model: WorkoutAssignment,
    as: "assignments",
    include: [{ model: Player, as: "player", attributes: [...PLAYER_ATTRS] }],
  },
];

export async function getWorkoutPlan(id: string) {
  const plan = await WorkoutPlan.findByPk(id, {
    include: WORKOUT_PLAN_INCLUDE as any,
  });
  if (!plan) throw new AppError("Workout plan not found", 404);
  return plan;
}

export async function createWorkoutPlan(
  input: CreateWorkoutPlanInput,
  createdBy: string,
) {
  return WorkoutPlan.create({ ...input, createdBy });
}

export async function updateWorkoutPlan(
  id: string,
  input: UpdateWorkoutPlanInput,
) {
  const plan = await findOrThrow(WorkoutPlan, id, "Workout plan");
  return plan.update(input);
}

export async function deleteWorkoutPlan(id: string) {
  return destroyById(WorkoutPlan, id, "Workout plan");
}

export async function duplicateWorkoutPlan(id: string, createdBy: string) {
  const original = await getWorkoutPlan(id);

  const plan = await WorkoutPlan.create({
    nameEn: `${original.nameEn} (Copy)`,
    nameAr: original.nameAr ? `${original.nameAr} (نسخة)` : null,
    description: original.description,
    descriptionAr: original.descriptionAr,
    durationWeeks: original.durationWeeks,
    daysPerWeek: original.daysPerWeek,
    type: original.type,
    status: "draft",
    createdBy,
  });

  if (original.sessions?.length) {
    for (const session of original.sessions) {
      const newSession = await WorkoutSession.create({
        planId: plan.id,
        weekNumber: session.weekNumber,
        dayNumber: session.dayNumber,
        sessionName: session.sessionName,
        sessionNameAr: session.sessionNameAr,
        notes: session.notes,
      });

      if (session.exercises?.length) {
        await WorkoutExercise.bulkCreate(
          session.exercises.map((ex) => ({
            sessionId: newSession.id,
            exerciseId: ex.exerciseId,
            customName: ex.customName,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restSeconds: ex.restSeconds,
            tempo: ex.tempo,
            sortOrder: ex.sortOrder,
            notes: ex.notes,
          })),
        );
      }
    }
  }

  return getWorkoutPlan(plan.id);
}

// ── Sessions ──

export async function addSession(planId: string, input: CreateSessionInput) {
  await findOrThrow(WorkoutPlan, planId, "Workout plan");
  return WorkoutSession.create({ ...input, planId });
}

export async function updateSession(
  sessionId: string,
  input: UpdateSessionInput,
) {
  const session = await findOrThrow(WorkoutSession, sessionId, "Session");
  return session.update(input);
}

export async function deleteSession(sessionId: string) {
  return destroyById(WorkoutSession, sessionId, "Session");
}

// ── Session Exercises ──

export async function addExerciseToSession(
  sessionId: string,
  input: CreateWorkoutExerciseInput,
) {
  await findOrThrow(WorkoutSession, sessionId, "Session");
  return WorkoutExercise.create({ ...input, sessionId });
}

export async function updateWorkoutExercise(exerciseId: string, input: any) {
  const exercise = await findOrThrow(WorkoutExercise, exerciseId, "Exercise");
  return exercise.update(input);
}

export async function deleteWorkoutExercise(exerciseId: string) {
  return destroyById(WorkoutExercise, exerciseId, "Exercise");
}

// ── Assignments ──

export async function assignWorkout(
  planId: string,
  input: AssignWorkoutInput,
  assignedBy: string,
) {
  await findOrThrow(WorkoutPlan, planId, "Workout plan");

  const records = input.playerIds.map((playerId) => ({
    planId,
    playerId,
    assignedBy,
    startDate: input.startDate,
    endDate: input.endDate,
    notes: input.notes,
  }));

  await WorkoutAssignment.bulkCreate(records as any, {
    updateOnDuplicate: [
      "assignedBy",
      "startDate",
      "endDate",
      "notes",
      "updatedAt",
    ],
  });

  return getWorkoutPlan(planId);
}

export async function removeAssignment(assignmentId: string) {
  return destroyById(WorkoutAssignment, assignmentId, "Assignment");
}

// ── Workout Logs (Player) ──

export async function logWorkoutSession(
  assignmentId: string,
  playerId: string,
  input: LogWorkoutInput,
) {
  const assignment = await findOrThrow(
    WorkoutAssignment,
    assignmentId,
    "Assignment",
  );
  if (assignment.playerId !== playerId) throw new AppError("Forbidden", 403);

  const log = await WorkoutLog.create({
    assignmentId,
    sessionId: input.sessionId,
    playerId,
    actualData: input.actualData ?? null,
    notes: input.notes,
  });

  // Update completion percentage
  const [totalSessions, completedSessions] = await Promise.all([
    WorkoutSession.count({ where: { planId: assignment.planId } }),
    WorkoutLog.count({
      where: { assignmentId },
      col: "sessionId",
      distinct: true,
    } as any),
  ]);

  const pct =
    totalSessions > 0
      ? Math.min(
          Math.round((Number(completedSessions) / totalSessions) * 100),
          100,
        )
      : 0;

  await assignment.update({
    completionPct: pct,
    status: pct >= 100 ? "completed" : "active",
  });

  // Fire-and-forget: auto-create task when workout completed
  if (pct >= 100) {
    generateWorkoutCompletedTask(assignmentId, playerId).catch((err) =>
      logger.warn("Workout completed auto-task failed", {
        assignmentId,
        error: (err as Error).message,
      }),
    );
  }

  return log;
}

export async function getPlayerWorkouts(playerId: string) {
  return WorkoutAssignment.findAll({
    where: { playerId },
    include: [
      {
        model: WorkoutPlan,
        as: "plan",
        include: [
          {
            model: WorkoutSession,
            as: "sessions",
            include: [
              {
                model: WorkoutExercise,
                as: "exercises",
                include: [{ model: ExerciseLibrary, as: "exercise" }],
              },
            ],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
}

export async function getWorkoutLogs(assignmentId: string) {
  return WorkoutLog.findAll({
    where: { assignmentId },
    order: [["completedAt", "DESC"]],
  });
}

// ═══════════════════════════════════════════
// FOOD DATABASE
// ═══════════════════════════════════════════

export async function listFoods(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "nameEn",
  );

  const where = {
    ...pickDefined(queryParams, ["category"]),
    ...bilingualSearch(search),
  };

  const { count, rows } = await FoodItem.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getFood(id: string) {
  return findOrThrow(FoodItem, id, "Food item");
}

export async function createFood(input: CreateFoodInput, createdBy: string) {
  return FoodItem.create({ ...input, isCustom: true, createdBy });
}

export async function updateFood(id: string, input: UpdateFoodInput) {
  const food = await findOrThrow(FoodItem, id, "Food item");
  return food.update(input);
}

export async function deleteFood(id: string) {
  return destroyById(FoodItem, id, "Food item");
}

// ═══════════════════════════════════════════
// DIET PLANS
// ═══════════════════════════════════════════

export async function listDietPlans(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );

  const where: any = {
    ...pickDefined(queryParams, ["status", "playerId"]),
    ...bilingualSearch(search),
  };
  if (queryParams.isTemplate === "true") where.isTemplate = true;

  const { count, rows } = await DietPlan.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getDietPlan(id: string) {
  const plan = await DietPlan.findByPk(id, {
    include: [
      {
        model: DietMeal,
        as: "meals",
        include: [
          {
            model: DietMealItem,
            as: "items",
            include: [{ model: FoodItem, as: "food" }],
            order: [["sortOrder", "ASC"]],
          },
        ],
        order: [
          ["dayNumber", "ASC"],
          ["sortOrder", "ASC"],
        ],
      },
    ],
  });
  if (!plan) throw new AppError("Diet plan not found", 404);
  return plan;
}

export async function createDietPlan(
  input: CreateDietPlanInput,
  createdBy: string,
) {
  return DietPlan.create({ ...input, createdBy });
}

export async function updateDietPlan(id: string, input: UpdateDietPlanInput) {
  const plan = await findOrThrow(DietPlan, id, "Diet plan");
  return plan.update(input);
}

export async function deleteDietPlan(id: string) {
  return destroyById(DietPlan, id, "Diet plan");
}

// ── Diet Meals ──

export async function addMealToPlan(
  planId: string,
  input: CreateDietMealInput,
) {
  await findOrThrow(DietPlan, planId, "Diet plan");

  const meal = await DietMeal.create({
    planId,
    dayNumber: input.dayNumber,
    mealType: input.mealType,
    sortOrder: input.sortOrder,
  });

  if (input.items?.length) {
    await DietMealItem.bulkCreate(
      input.items.map((item) => ({ ...item, mealId: meal.id })),
    );
  }

  return getDietPlan(planId);
}

export async function deleteMeal(mealId: string) {
  return destroyById(DietMeal, mealId, "Meal");
}

export async function addItemToMeal(mealId: string, input: any) {
  await findOrThrow(DietMeal, mealId, "Meal");
  return DietMealItem.create({ ...input, mealId });
}

export async function deleteItemFromMeal(itemId: string) {
  return destroyById(DietMealItem, itemId, "Meal item");
}

// ── Diet Adherence (Player) ──

export async function logDietAdherence(
  planId: string,
  playerId: string,
  input: LogAdherenceInput,
) {
  return DietAdherence.create({
    planId,
    playerId,
    mealId: input.mealId,
    date: input.date || new Date().toISOString().split("T")[0],
    status: input.status,
    notes: input.notes,
  });
}

export async function getPlayerDietAdherence(
  playerId: string,
  queryParams: any,
) {
  const dateRange = buildDateRange(queryParams.from, queryParams.to);
  const where: any = { playerId };
  if (queryParams.planId) where.planId = queryParams.planId;
  if (dateRange) where.date = dateRange;

  return DietAdherence.findAll({
    where,
    order: [["date", "DESC"]],
    limit: 100,
  });
}

// ═══════════════════════════════════════════
// COACH DASHBOARD
// ═══════════════════════════════════════════

export async function getCoachDashboard(coachId: string) {
  const [activeAssignments, alerts] = await Promise.all([
    WorkoutAssignment.findAll({
      where: { status: "active", assignedBy: coachId },
      include: [
        { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
        {
          model: WorkoutPlan,
          as: "plan",
          attributes: ["id", "nameEn", "nameAr"],
        },
      ],
    }),
    CoachAlert.findAll({
      where: { coachId, isRead: false },
      order: [["triggeredAt", "DESC"]],
      limit: 20,
    }),
  ]);

  const playerIds = [...new Set(activeAssignments.map((a) => a.playerId))];

  const latestMetrics = playerIds.length
    ? await BodyMetric.findAll({
        where: {
          playerId: { [Op.in]: playerIds },
          date: {
            [Op.gte]: Sequelize.literal("CURRENT_DATE - INTERVAL '30 days'"),
          },
        },
        order: [["date", "DESC"]],
      })
    : [];

  return {
    activeAssignments,
    latestMetrics,
    alerts,
    totalPlayers: playerIds.length,
    totalActivePlans: activeAssignments.length,
    unreadAlerts: alerts.length,
  };
}

export async function markAlertRead(alertId: string, coachId: string) {
  const alert = await findOrThrow(CoachAlert, alertId, "Alert");
  if (alert.coachId !== coachId) throw new AppError("Forbidden", 403);
  return alert.update({ isRead: true });
}
