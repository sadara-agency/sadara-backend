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
} from "./gym.model";
import { Player } from "../players/player.model";
import { AppError } from "../../middleware/errorHandler";
import { parsePagination, buildMeta } from "../../shared/utils/pagination";
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
} from "./gym.schema";

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
  const where: any = {};

  if (queryParams.muscleGroup) where.muscleGroup = queryParams.muscleGroup;
  if (queryParams.equipment) where.equipment = queryParams.equipment;
  if (queryParams.difficulty) where.difficulty = queryParams.difficulty;
  if (search) {
    where[Op.or] = [
      { nameEn: { [Op.iLike]: `%${search}%` } },
      { nameAr: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await ExerciseLibrary.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getExercise(id: string) {
  const ex = await ExerciseLibrary.findByPk(id);
  if (!ex) throw new AppError("Exercise not found", 404);
  return ex;
}

export async function createExercise(
  input: CreateExerciseInput,
  createdBy: string,
) {
  return ExerciseLibrary.create({ ...input, isCustom: true, createdBy } as any);
}

export async function updateExercise(id: string, input: UpdateExerciseInput) {
  const ex = await ExerciseLibrary.findByPk(id);
  if (!ex) throw new AppError("Exercise not found", 404);
  return ex.update(input as any);
}

export async function deleteExercise(id: string) {
  const ex = await ExerciseLibrary.findByPk(id);
  if (!ex) throw new AppError("Exercise not found", 404);
  await ex.destroy();
  return { id };
}

// ═══════════════════════════════════════════
// BODY METRICS
// ═══════════════════════════════════════════

export async function listBodyMetrics(playerId: string, queryParams: any) {
  const { limit, offset, page } = parsePagination(queryParams, "date");
  const where: any = { playerId };

  if (queryParams.from)
    where.date = { ...where.date, [Op.gte]: queryParams.from };
  if (queryParams.to)
    where.date = { ...(where.date || {}), [Op.lte]: queryParams.to };

  const { count, rows } = await BodyMetric.findAndCountAll({
    where,
    limit,
    offset,
    order: [["date", "DESC"]],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function createBodyMetric(
  input: CreateBodyMetricInput,
  recordedBy: string,
) {
  // Auto-calculate BMI if weight and height provided
  const data: any = { ...input, recordedBy };
  if (input.weight && input.height) {
    const heightM = input.height / 100;
    data.bmi = parseFloat((input.weight / (heightM * heightM)).toFixed(1));
  }
  return BodyMetric.create(data);
}

export async function updateBodyMetric(
  id: string,
  input: UpdateBodyMetricInput,
) {
  const metric = await BodyMetric.findByPk(id);
  if (!metric) throw new AppError("Body metric not found", 404);
  return metric.update(input as any);
}

export async function deleteBodyMetric(id: string) {
  const metric = await BodyMetric.findByPk(id);
  if (!metric) throw new AppError("Body metric not found", 404);
  await metric.destroy();
  return { id };
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
  // Deactivate existing active target
  await MetricTarget.update(
    { status: "cancelled" },
    { where: { playerId: input.playerId, status: "active" } },
  );
  return MetricTarget.create({ ...input, setBy } as any);
}

export async function updateMetricTarget(
  id: string,
  input: UpdateMetricTargetInput,
) {
  const target = await MetricTarget.findByPk(id);
  if (!target) throw new AppError("Metric target not found", 404);
  return target.update(input as any);
}

// ═══════════════════════════════════════════
// BMR CALCULATOR
// ═══════════════════════════════════════════

export async function calculateAndSaveBmr(
  input: CalculateBmrInput,
  calculatedBy: string,
) {
  // Mifflin-St Jeor equation
  let bmr: number;
  if (input.gender === "male") {
    bmr = 10 * input.weight + 6.25 * input.height - 5 * input.age + 5;
  } else {
    bmr = 10 * input.weight + 6.25 * input.height - 5 * input.age - 161;
  }

  // Activity multiplier
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extra_active: 1.9,
  };
  const tdee = bmr * (multipliers[input.activityLevel] || 1.55);

  // Goal adjustment
  let targetCalories = tdee;
  if (input.goal === "cut") targetCalories = tdee - 500;
  if (input.goal === "bulk") targetCalories = tdee + 300;

  // Macro split
  const proteinG = (targetCalories * 0.3) / 4;
  const fatG = (targetCalories * 0.25) / 9;
  const carbsG = (targetCalories - proteinG * 4 - fatG * 9) / 4;

  return BmrCalculation.create({
    ...input,
    calculatedBy,
    bmr: parseFloat(bmr.toFixed(1)),
    tdee: parseFloat(tdee.toFixed(1)),
    targetCalories: parseFloat(targetCalories.toFixed(1)),
    proteinG: parseFloat(proteinG.toFixed(1)),
    carbsG: parseFloat(carbsG.toFixed(1)),
    fatG: parseFloat(fatG.toFixed(1)),
  } as any);
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
  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.type) where.type = queryParams.type;
  if (search) {
    where[Op.or] = [
      { nameEn: { [Op.iLike]: `%${search}%` } },
      { nameAr: { [Op.iLike]: `%${search}%` } },
    ];
  }

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

export async function getWorkoutPlan(id: string) {
  const plan = await WorkoutPlan.findByPk(id, {
    include: [
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
        include: [
          { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
        ],
      },
    ],
  });
  if (!plan) throw new AppError("Workout plan not found", 404);
  return plan;
}

export async function createWorkoutPlan(
  input: CreateWorkoutPlanInput,
  createdBy: string,
) {
  return WorkoutPlan.create({ ...input, createdBy } as any);
}

export async function updateWorkoutPlan(
  id: string,
  input: UpdateWorkoutPlanInput,
) {
  const plan = await WorkoutPlan.findByPk(id);
  if (!plan) throw new AppError("Workout plan not found", 404);
  return plan.update(input as any);
}

export async function deleteWorkoutPlan(id: string) {
  const plan = await WorkoutPlan.findByPk(id);
  if (!plan) throw new AppError("Workout plan not found", 404);
  await plan.destroy();
  return { id };
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
  } as any);

  // Copy sessions and exercises
  if (original.sessions) {
    for (const session of original.sessions) {
      const newSession = await WorkoutSession.create({
        planId: plan.id,
        weekNumber: session.weekNumber,
        dayNumber: session.dayNumber,
        sessionName: session.sessionName,
        sessionNameAr: session.sessionNameAr,
        notes: session.notes,
      } as any);

      if (session.exercises) {
        for (const ex of session.exercises) {
          await WorkoutExercise.create({
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
          } as any);
        }
      }
    }
  }

  return getWorkoutPlan(plan.id);
}

// ── Sessions ──

export async function addSession(planId: string, input: CreateSessionInput) {
  const plan = await WorkoutPlan.findByPk(planId);
  if (!plan) throw new AppError("Workout plan not found", 404);
  return WorkoutSession.create({ ...input, planId } as any);
}

export async function updateSession(
  sessionId: string,
  input: UpdateSessionInput,
) {
  const session = await WorkoutSession.findByPk(sessionId);
  if (!session) throw new AppError("Session not found", 404);
  return session.update(input as any);
}

export async function deleteSession(sessionId: string) {
  const session = await WorkoutSession.findByPk(sessionId);
  if (!session) throw new AppError("Session not found", 404);
  await session.destroy();
  return { id: sessionId };
}

// ── Session Exercises ──

export async function addExerciseToSession(
  sessionId: string,
  input: CreateWorkoutExerciseInput,
) {
  const session = await WorkoutSession.findByPk(sessionId);
  if (!session) throw new AppError("Session not found", 404);
  return WorkoutExercise.create({ ...input, sessionId } as any);
}

export async function updateWorkoutExercise(exerciseId: string, input: any) {
  const ex = await WorkoutExercise.findByPk(exerciseId);
  if (!ex) throw new AppError("Exercise not found", 404);
  return ex.update(input);
}

export async function deleteWorkoutExercise(exerciseId: string) {
  const ex = await WorkoutExercise.findByPk(exerciseId);
  if (!ex) throw new AppError("Exercise not found", 404);
  await ex.destroy();
  return { id: exerciseId };
}

// ── Assignments ──

export async function assignWorkout(
  planId: string,
  input: AssignWorkoutInput,
  assignedBy: string,
) {
  const plan = await WorkoutPlan.findByPk(planId);
  if (!plan) throw new AppError("Workout plan not found", 404);

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
  const assignment = await WorkoutAssignment.findByPk(assignmentId);
  if (!assignment) throw new AppError("Assignment not found", 404);
  await assignment.destroy();
  return { id: assignmentId };
}

// ── Workout Logs (Player) ──

export async function logWorkoutSession(
  assignmentId: string,
  playerId: string,
  input: LogWorkoutInput,
) {
  const assignment = await WorkoutAssignment.findByPk(assignmentId);
  if (!assignment) throw new AppError("Assignment not found", 404);
  if (assignment.playerId !== playerId) throw new AppError("Forbidden", 403);

  const log = await WorkoutLog.create({
    assignmentId,
    sessionId: input.sessionId,
    playerId,
    actualData: input.actualData ?? null,
    notes: input.notes,
  } as any);

  // Update completion percentage
  const totalSessions = await WorkoutSession.count({
    where: { planId: assignment.planId },
  });
  const completedSessions = Number(
    await WorkoutLog.count({
      where: { assignmentId },
      col: "sessionId",
      distinct: true,
    } as any),
  );

  const pct =
    totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;
  await assignment.update({
    completionPct: Math.min(pct, 100),
    status: pct >= 100 ? "completed" : "active",
  });

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
  const where: any = {};

  if (queryParams.category) where.category = queryParams.category;
  if (search) {
    where[Op.or] = [
      { nameEn: { [Op.iLike]: `%${search}%` } },
      { nameAr: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await FoodItem.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getFood(id: string) {
  const food = await FoodItem.findByPk(id);
  if (!food) throw new AppError("Food item not found", 404);
  return food;
}

export async function createFood(input: CreateFoodInput, createdBy: string) {
  return FoodItem.create({ ...input, isCustom: true, createdBy } as any);
}

export async function updateFood(id: string, input: UpdateFoodInput) {
  const food = await FoodItem.findByPk(id);
  if (!food) throw new AppError("Food item not found", 404);
  return food.update(input as any);
}

export async function deleteFood(id: string) {
  const food = await FoodItem.findByPk(id);
  if (!food) throw new AppError("Food item not found", 404);
  await food.destroy();
  return { id };
}

// ═══════════════════════════════════════════
// DIET PLANS
// ═══════════════════════════════════════════

export async function listDietPlans(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );
  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.isTemplate === "true") where.isTemplate = true;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (search) {
    where[Op.or] = [
      { nameEn: { [Op.iLike]: `%${search}%` } },
      { nameAr: { [Op.iLike]: `%${search}%` } },
    ];
  }

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
  return DietPlan.create({ ...input, createdBy } as any);
}

export async function updateDietPlan(id: string, input: UpdateDietPlanInput) {
  const plan = await DietPlan.findByPk(id);
  if (!plan) throw new AppError("Diet plan not found", 404);
  return plan.update(input as any);
}

export async function deleteDietPlan(id: string) {
  const plan = await DietPlan.findByPk(id);
  if (!plan) throw new AppError("Diet plan not found", 404);
  await plan.destroy();
  return { id };
}

// ── Diet Meals ──

export async function addMealToPlan(
  planId: string,
  input: CreateDietMealInput,
) {
  const plan = await DietPlan.findByPk(planId);
  if (!plan) throw new AppError("Diet plan not found", 404);

  const meal = await DietMeal.create({
    planId,
    dayNumber: input.dayNumber,
    mealType: input.mealType,
    sortOrder: input.sortOrder,
  } as any);

  // Add items if provided
  if (input.items?.length) {
    for (const item of input.items) {
      await DietMealItem.create({ ...item, mealId: meal.id } as any);
    }
  }

  return getDietPlan(planId);
}

export async function deleteMeal(mealId: string) {
  const meal = await DietMeal.findByPk(mealId);
  if (!meal) throw new AppError("Meal not found", 404);
  await meal.destroy();
  return { id: mealId };
}

export async function addItemToMeal(mealId: string, input: any) {
  const meal = await DietMeal.findByPk(mealId);
  if (!meal) throw new AppError("Meal not found", 404);
  return DietMealItem.create({ ...input, mealId } as any);
}

export async function deleteItemFromMeal(itemId: string) {
  const item = await DietMealItem.findByPk(itemId);
  if (!item) throw new AppError("Meal item not found", 404);
  await item.destroy();
  return { id: itemId };
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
  } as any);
}

export async function getPlayerDietAdherence(
  playerId: string,
  queryParams: any,
) {
  const where: any = { playerId };
  if (queryParams.planId) where.planId = queryParams.planId;
  if (queryParams.from) where.date = { [Op.gte]: queryParams.from };
  if (queryParams.to)
    where.date = { ...(where.date || {}), [Op.lte]: queryParams.to };

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
  // Get all players with active workout or diet assignments
  const activeAssignments = await WorkoutAssignment.findAll({
    where: { status: "active", assignedBy: coachId },
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      {
        model: WorkoutPlan,
        as: "plan",
        attributes: ["id", "nameEn", "nameAr"],
      },
    ],
  });

  // Get latest metrics for assigned players
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

  // Get unread alerts
  const alerts = await CoachAlert.findAll({
    where: { coachId, isRead: false },
    order: [["triggeredAt", "DESC"]],
    limit: 20,
  });

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
  const alert = await CoachAlert.findByPk(alertId);
  if (!alert) throw new AppError("Alert not found", 404);
  if (alert.coachId !== coachId) throw new AppError("Forbidden", 403);
  return alert.update({ isRead: true });
}
