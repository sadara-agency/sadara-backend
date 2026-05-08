import { Op } from "sequelize";
import { addDays, format, parseISO, getDay } from "date-fns";
import {
  WorkoutPlan,
  WorkoutPlanDay,
  WorkoutPlanExercise,
  WorkoutSession,
  WorkoutSetLog,
  PhaseRule,
} from "./workoutPlan.model";
import { WellnessExercise } from "./fitness.model";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import type {
  CreateWorkoutPlanDTO,
  UpdateWorkoutPlanDTO,
  LogSetDTO,
} from "./workoutPlan.validation";

// ── helpers ──

function applyPhaseToWeight(
  baseKg: number | null | undefined,
  week: number,
  phaseConfig: PhaseRule[] | null | undefined,
): number | null {
  if (!baseKg || !phaseConfig?.length) return baseKg ?? null;
  const phase = phaseConfig.find(
    (p) => week >= p.weekStart && week <= p.weekEnd,
  );
  if (!phase?.weightDeltaKg) return baseKg;
  return Math.max(0, baseKg + phase.weightDeltaKg * (week - phase.weekStart));
}

function applyPhaseToReps(
  baseReps: string,
  week: number,
  phaseConfig: PhaseRule[] | null | undefined,
): string {
  if (!phaseConfig?.length) return baseReps;
  const phase = phaseConfig.find(
    (p) => week >= p.weekStart && week <= p.weekEnd,
  );
  if (!phase?.repsDelta) return baseReps;
  const match = baseReps.match(/^(\d+)-(\d+)$/);
  if (!match) return baseReps;
  const delta = phase.repsDelta * (week - phase.weekStart);
  return `${parseInt(match[1]) + delta}-${parseInt(match[2]) + delta}`;
}

// ── CRUD ──

export async function listWorkoutPlans(
  query: Record<string, unknown>,
  user?: AuthUser,
) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const where: Record<string, unknown> = {};

  if (user?.role === "Player") where.playerId = user.id;
  if (query.playerId) where.playerId = query.playerId;
  if (query.status) where.status = query.status;

  const { rows, count } = await WorkoutPlan.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: WorkoutPlanDay,
        as: "days",
        include: [{ model: WorkoutPlanExercise, as: "exercises" }],
      },
    ],
  });

  return {
    data: rows,
    meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

export async function getWorkoutPlanById(id: string, user?: AuthUser) {
  const plan = await WorkoutPlan.findByPk(id, {
    include: [
      {
        model: WorkoutPlanDay,
        as: "days",
        include: [
          {
            model: WorkoutPlanExercise,
            as: "exercises",
            include: [{ model: WellnessExercise, as: "exercise" }],
          },
        ],
      },
    ],
  });
  if (!plan) throw new AppError("Workout plan not found", 404);
  if (user?.role === "Player" && plan.playerId !== user.id) {
    throw new AppError("Forbidden", 403);
  }
  return plan;
}

export async function createWorkoutPlan(
  data: CreateWorkoutPlanDTO,
  createdBy: string,
) {
  const plan = await WorkoutPlan.create({
    playerId: data.playerId ?? null,
    name: data.name,
    nameAr: data.nameAr ?? null,
    goal: data.goal,
    startDate: data.startDate,
    durationWeeks: data.durationWeeks,
    status: data.status ?? "draft",
    phaseConfig: data.phaseConfig ?? null,
    notes: data.notes ?? null,
    createdBy,
  });

  // Create days + exercises
  for (const dayData of data.days) {
    const day = await WorkoutPlanDay.create({
      planId: plan.id,
      dayOfWeek: dayData.dayOfWeek,
      isRest: dayData.isRest,
      label: dayData.label ?? null,
    });

    if (!dayData.isRest) {
      for (const ex of dayData.exercises) {
        await WorkoutPlanExercise.create({
          planDayId: day.id,
          exerciseId: ex.exerciseId,
          orderIndex: ex.orderIndex,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeightKg: ex.targetWeightKg ?? null,
          restSeconds: ex.restSeconds ?? null,
          notes: ex.notes ?? null,
        });
      }
    }
  }

  // Fan out sessions if active
  if (plan.status === "active" && plan.playerId) {
    await generateSessions(plan);
  }

  return getWorkoutPlanById(plan.id);
}

export async function updateWorkoutPlan(
  id: string,
  data: UpdateWorkoutPlanDTO,
) {
  const plan = await WorkoutPlan.findByPk(id);
  if (!plan) throw new AppError("Workout plan not found", 404);

  const wasNotActive = plan.status !== "active";
  await plan.update(data);

  // If just activated and has a player, generate sessions
  if (data.status === "active" && wasNotActive && plan.playerId) {
    const existing = await WorkoutSession.count({ where: { planId: id } });
    if (existing === 0) await generateSessions(plan);
  }

  return getWorkoutPlanById(id);
}

export async function deleteWorkoutPlan(id: string) {
  const plan = await WorkoutPlan.findByPk(id);
  if (!plan) throw new AppError("Workout plan not found", 404);
  await plan.destroy();
  return { id };
}

// ── Session fan-out ──

async function generateSessions(plan: WorkoutPlan) {
  const days = await WorkoutPlanDay.findAll({
    where: { planId: plan.id, isRest: false },
  });
  const dayMap = new Map(days.map((d) => [d.dayOfWeek, d]));

  const start = parseISO(plan.startDate);
  const totalDays = plan.durationWeeks * 7;

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(start, i);
    const dow = getDay(date); // 0=Sun…6=Sat
    const planDay = dayMap.get(dow);
    if (!planDay) continue;

    await WorkoutSession.create({
      planId: plan.id,
      planDayId: planDay.id,
      playerId: plan.playerId!,
      scheduledDate: format(date, "yyyy-MM-dd"),
      status: "pending",
    });
  }
}

// ── Session actions ──

export async function getTodaysWorkout(playerId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const session = await WorkoutSession.findOne({
    where: {
      playerId,
      scheduledDate: today,
      status: { [Op.in]: ["pending", "in_progress"] },
    },
    include: [
      {
        model: WorkoutPlan,
        as: "plan",
      },
      {
        model: WorkoutPlanDay,
        as: "planDay",
        include: [
          {
            model: WorkoutPlanExercise,
            as: "exercises",
            include: [{ model: WellnessExercise, as: "exercise" }],
          },
        ],
      },
    ],
  });
  return session;
}

export async function getWeeklyWorkouts(playerId: string) {
  const today = new Date();
  const weekStart = format(addDays(today, -getDay(today)), "yyyy-MM-dd");
  const weekEnd = format(addDays(today, 6 - getDay(today)), "yyyy-MM-dd");

  return WorkoutSession.findAll({
    where: {
      playerId,
      scheduledDate: { [Op.between]: [weekStart, weekEnd] },
    },
    include: [
      { model: WorkoutPlan, as: "plan" },
      {
        model: WorkoutPlanDay,
        as: "planDay",
        include: [
          {
            model: WorkoutPlanExercise,
            as: "exercises",
            include: [{ model: WellnessExercise, as: "exercise" }],
          },
        ],
      },
    ],
    order: [["scheduledDate", "ASC"]],
  });
}

export async function startSession(sessionId: string, playerId: string) {
  const session = await WorkoutSession.findByPk(sessionId);
  if (!session) throw new AppError("Session not found", 404);
  if (session.playerId !== playerId) throw new AppError("Forbidden", 403);
  if (session.status === "completed")
    throw new AppError("Session already completed", 422);

  await session.update({ status: "in_progress", startedAt: new Date() });
  return session;
}

export async function completeSession(sessionId: string, playerId: string) {
  const session = await WorkoutSession.findByPk(sessionId);
  if (!session) throw new AppError("Session not found", 404);
  if (session.playerId !== playerId) throw new AppError("Forbidden", 403);

  await session.update({ status: "completed", completedAt: new Date() });
  return session;
}

export async function skipSession(sessionId: string, playerId: string) {
  const session = await WorkoutSession.findByPk(sessionId);
  if (!session) throw new AppError("Session not found", 404);
  if (session.playerId !== playerId) throw new AppError("Forbidden", 403);

  await session.update({ status: "skipped" });
  return session;
}

// ── Set logging ──

export async function logSet(
  sessionId: string,
  data: LogSetDTO,
  playerId: string,
) {
  const session = await WorkoutSession.findByPk(sessionId);
  if (!session) throw new AppError("Session not found", 404);
  if (session.playerId !== playerId) throw new AppError("Forbidden", 403);
  if (session.status === "skipped")
    throw new AppError("Cannot log sets for a skipped session", 422);

  // Auto-start session on first log
  if (session.status === "pending") {
    await session.update({ status: "in_progress", startedAt: new Date() });
  }

  const log = await WorkoutSetLog.create({
    sessionId,
    exerciseId: data.exerciseId,
    setNumber: data.setNumber,
    actualReps: data.actualReps ?? null,
    actualWeightKg: data.actualWeightKg ?? null,
    rpe: data.rpe ?? null,
    notes: data.notes ?? null,
    loggedAt: new Date(),
  });

  return log;
}

export async function getSessionLogs(sessionId: string) {
  return WorkoutSetLog.findAll({
    where: { sessionId },
    include: [{ model: WellnessExercise, as: "exercise" }],
    order: [["loggedAt", "ASC"]],
  });
}

// ── Coach analytics ──

export async function getPlanAdherence(planId: string) {
  const plan = await WorkoutPlan.findByPk(planId);
  if (!plan) throw new AppError("Workout plan not found", 404);

  const today = format(new Date(), "yyyy-MM-dd");
  const allSessions = await WorkoutSession.findAll({ where: { planId } });
  const scheduledToDate = allSessions.filter((s) => s.scheduledDate <= today);
  const completed = scheduledToDate.filter((s) => s.status === "completed");
  const skipped = scheduledToDate.filter((s) => s.status === "skipped");
  const missed = scheduledToDate.filter(
    (s) => s.status === "pending" && s.scheduledDate < today,
  );

  return {
    total: allSessions.length,
    scheduledToDate: scheduledToDate.length,
    completed: completed.length,
    skipped: skipped.length,
    missed: missed.length,
    adherencePct:
      scheduledToDate.length > 0
        ? Math.round((completed.length / scheduledToDate.length) * 100)
        : 0,
    sessions: allSessions,
  };
}

export async function getExerciseProgression(
  planId: string,
  exerciseId: string,
) {
  const sessions = await WorkoutSession.findAll({
    where: { planId, status: "completed" },
    attributes: ["id", "scheduledDate"],
    order: [["scheduledDate", "ASC"]],
  });

  if (!sessions.length) return [];

  const sessionIds = sessions.map((s) => s.id);
  const logs = await WorkoutSetLog.findAll({
    where: { sessionId: { [Op.in]: sessionIds }, exerciseId },
    order: [["loggedAt", "ASC"]],
  });

  // Group top set per session
  const sessionDateMap = new Map(sessions.map((s) => [s.id, s.scheduledDate]));
  const bySession = new Map<string, WorkoutSetLog[]>();
  for (const log of logs) {
    if (!bySession.has(log.sessionId)) bySession.set(log.sessionId, []);
    bySession.get(log.sessionId)!.push(log);
  }

  return Array.from(bySession.entries()).map(([sid, sessionLogs]) => {
    const topSet = sessionLogs.reduce((best, cur) =>
      (cur.actualWeightKg ?? 0) > (best.actualWeightKg ?? 0) ? cur : best,
    );
    return {
      date: sessionDateMap.get(sid),
      topWeightKg: topSet.actualWeightKg,
      topReps: topSet.actualReps,
      totalSets: sessionLogs.length,
    };
  });
}

// Re-export types for convenience
export type { PhaseRule };
export { applyPhaseToWeight, applyPhaseToReps };
