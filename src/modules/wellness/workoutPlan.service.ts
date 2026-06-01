import { Op } from "sequelize";
import {
  WorkoutPlan,
  WorkoutPlanDay,
  WorkoutPlanExercise,
  WorkoutSession,
  WorkoutSetLog,
  PhaseRule,
} from "./workoutPlan.model";
import type { WorkoutSessionStatus } from "./workoutPlan.model";
import { WellnessExercise } from "./fitness.model";
import {
  DevelopmentProgram,
  ProgramExercise,
} from "./developmentProgram.model";
import { ProgramDaySession } from "./programDaySession.model";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import type {
  CreateWorkoutPlanDTO,
  UpdateWorkoutPlanDTO,
  LogSetDTO,
} from "./workoutPlan.validation";

// ── date helpers (no external dep) ──

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

// ── phase helpers ──

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

  const start = new Date(plan.startDate + "T00:00:00Z");
  const totalDays = plan.durationWeeks * 7;

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(start, i);
    const dow = date.getUTCDay(); // 0=Sun…6=Sat
    const planDay = dayMap.get(dow);
    if (!planDay) continue;

    await WorkoutSession.create({
      planId: plan.id,
      planDayId: planDay.id,
      playerId: plan.playerId!,
      scheduledDate: toDateString(date),
      status: "pending",
    });
  }
}

// ── Player weekly/today workouts (sourced from the DevelopmentProgram system) ──
//
// The player Workouts page reads coach-assigned training directly from the
// active DevelopmentProgram → ProgramDaySession tables and projects each
// day-session into the WorkoutSession shape the frontend renders. The legacy
// WorkoutPlan/WorkoutSession tables are not used for this read path.

type ProjectedExercise = {
  id: string;
  planDayId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  targetWeightKg: number | null;
  restSeconds: number | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    nameAr: string | null;
    muscleGroup: string | null;
    equipment: string | null;
    videoUrl: string | null;
  } | null;
};

type ProjectedSession = {
  id: string;
  planId: string;
  planDayId: string;
  playerId: string;
  scheduledDate: string;
  status: WorkoutSessionStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationMin: number | null;
  playerNotes: string | null;
  plan: { id: string; name: string; nameAr: string | null; goal: string };
  planDay: {
    id: string;
    planId: string;
    dayOfWeek: number;
    isRest: false;
    label: string | null;
    exercises: ProjectedExercise[];
  };
};

function categoryToGoal(category: string | null | undefined): string {
  switch (category) {
    case "hypertrophy":
      return "hypertrophy";
    case "cardio":
      return "cardio";
    case "recovery":
      return "recovery";
    case "strength":
      return "strength";
    default:
      return "strength";
  }
}

async function loadActivePrograms(
  playerId: string,
): Promise<DevelopmentProgram[]> {
  return DevelopmentProgram.findAll({
    where: { playerId, isActive: true },
    include: [
      {
        model: ProgramDaySession,
        as: "daySessions",
        include: [
          {
            model: ProgramExercise,
            as: "exercises",
            include: [{ model: WellnessExercise, as: "exercise" }],
          },
        ],
      },
    ],
    order: [
      ["createdAt", "DESC"],
      [{ model: ProgramDaySession, as: "daySessions" }, "orderIndex", "ASC"],
    ],
  });
}

function overlayKey(planId: string, planDayId: string, date: string): string {
  return `${planId}::${planDayId}::${date}`;
}

function projectProgramsToSessions(
  programs: DevelopmentProgram[],
  playerId: string,
  weekStart: Date,
  overlay?: Map<string, WorkoutSession>,
): ProjectedSession[] {
  const sessions: ProjectedSession[] = [];

  for (const program of programs) {
    const daySessions = program.daySessions ?? [];
    daySessions.forEach((ds, idx) => {
      // dayOfWeek is 0=Sun…6=Sat; null → distribute by order across the week
      const dow = ds.dayOfWeek != null ? ds.dayOfWeek : idx % 7;
      const scheduledDate = toDateString(addDays(weekStart, dow));

      const exercises: ProjectedExercise[] = (ds.exercises ?? []).map((ex) => {
        const wex = (
          ex as ProgramExercise & {
            exercise?: WellnessExercise;
          }
        ).exercise;
        return {
          id: ex.id,
          planDayId: ds.id,
          exerciseId: ex.exerciseId,
          orderIndex: ex.orderIndex,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeightKg: ex.targetWeightKg,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          exercise: wex
            ? {
                id: wex.id,
                name: wex.name,
                nameAr: wex.nameAr,
                muscleGroup: wex.muscleGroup,
                equipment: wex.equipment,
                videoUrl: wex.videoUrl,
              }
            : null,
        };
      });

      const materialized = overlay?.get(
        overlayKey(program.id, ds.id, scheduledDate),
      );

      sessions.push({
        id: materialized?.id ?? ds.id,
        planId: program.id,
        planDayId: ds.id,
        playerId,
        scheduledDate,
        status: materialized?.status ?? "pending",
        startedAt: materialized?.startedAt
          ? materialized.startedAt.toISOString()
          : null,
        completedAt: materialized?.completedAt
          ? materialized.completedAt.toISOString()
          : null,
        durationMin: materialized?.durationMin ?? null,
        playerNotes: materialized?.playerNotes ?? null,
        plan: {
          id: program.id,
          name: program.name,
          nameAr: program.nameAr,
          goal: categoryToGoal(program.category),
        },
        planDay: {
          id: ds.id,
          planId: program.id,
          dayOfWeek: dow,
          isRest: false,
          label: ds.labelAr ?? ds.label,
          exercises,
        },
      });
    });
  }

  sessions.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  return sessions;
}

// ── Session actions ──

// Load any materialized workout_sessions for the player within [weekStart, weekEnd]
// and key them by (planId, planDayId, scheduledDate) so the projection can overlay
// real status/duration onto the projected days.
async function loadOverlayForWeek(
  playerId: string,
  weekStart: Date,
): Promise<Map<string, WorkoutSession>> {
  const weekEnd = addDays(weekStart, 6);
  const rows = await WorkoutSession.findAll({
    where: {
      playerId,
      scheduledDate: {
        [Op.between]: [toDateString(weekStart), toDateString(weekEnd)],
      },
    },
  });
  const map = new Map<string, WorkoutSession>();
  for (const row of rows ?? []) {
    map.set(overlayKey(row.planId, row.planDayId, row.scheduledDate), row);
  }
  return map;
}

export async function getTodaysWorkout(
  playerId: string,
): Promise<ProjectedSession | null> {
  const now = new Date();
  const weekStart = addDays(now, -now.getUTCDay());
  const today = toDateString(now);

  const programs = await loadActivePrograms(playerId);
  const overlay = await loadOverlayForWeek(playerId, weekStart);
  const sessions = projectProgramsToSessions(
    programs,
    playerId,
    weekStart,
    overlay,
  );
  return sessions.find((s) => s.scheduledDate === today) ?? null;
}

export async function getWeeklyWorkouts(
  playerId: string,
): Promise<ProjectedSession[]> {
  const now = new Date();
  const weekStart = addDays(now, -now.getUTCDay());

  const programs = await loadActivePrograms(playerId);
  const overlay = await loadOverlayForWeek(playerId, weekStart);
  return projectProgramsToSessions(programs, playerId, weekStart, overlay);
}

// ── Materialize-on-interaction ──
//
// The player's weekly list is projected from DevelopmentProgram day-sessions, so
// each projected `id` is a program_day_sessions id with no matching
// workout_sessions row. Before any write (start/log/complete) we resolve that
// projection identity into a real, persistent workout_sessions row.

export type ResolveSessionArgs = {
  programId: string;
  daySessionId: string;
  scheduledDate: string;
};

export async function resolveOrMaterializeSession(
  args: ResolveSessionArgs,
  playerId: string,
): Promise<WorkoutSession> {
  const { programId, daySessionId, scheduledDate } = args;

  // Ownership: the program must be one the player can access (owned directly or
  // via their active training block) and contain the given day-session.
  const programs = await loadActivePrograms(playerId);
  const program = programs.find((p) => p.id === programId);
  if (!program) throw new AppError("Workout program not found", 404);
  const daySession = (program.daySessions ?? []).find(
    (ds) => ds.id === daySessionId,
  );
  if (!daySession) throw new AppError("Workout day not found", 404);

  const [session] = await WorkoutSession.findOrCreate({
    where: { planId: programId, planDayId: daySessionId, scheduledDate },
    defaults: {
      planId: programId,
      planDayId: daySessionId,
      playerId,
      scheduledDate,
      status: "pending",
    },
  });
  return session;
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

export async function completeSession(
  sessionId: string,
  playerId: string,
  extra?: { durationMin?: number | null; playerNotes?: string | null },
) {
  const session = await WorkoutSession.findByPk(sessionId);
  if (!session) throw new AppError("Session not found", 404);
  if (session.playerId !== playerId) throw new AppError("Forbidden", 403);

  await session.update({
    status: "completed",
    completedAt: new Date(),
    startedAt: session.startedAt ?? new Date(),
    durationMin: extra?.durationMin ?? session.durationMin,
    playerNotes: extra?.playerNotes ?? session.playerNotes,
  });
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

// ── Workout history (player) ──

export type WorkoutHistoryRow = {
  id: string;
  programId: string;
  daySessionId: string;
  planName: string;
  planNameAr: string | null;
  dayLabel: string | null;
  status: WorkoutSessionStatus;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMin: number | null;
  exerciseCount: number;
};

export async function listWorkoutHistory(
  playerId: string,
  query: Record<string, unknown>,
) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;

  const { rows, count } = await WorkoutSession.findAndCountAll({
    where: {
      playerId,
      status: { [Op.in]: ["completed", "in_progress", "skipped"] },
    },
    limit,
    offset: (page - 1) * limit,
    order: [["scheduledDate", "DESC"]],
  });

  // Resolve program names + day labels + per-day exercise counts in bulk.
  const programIds = Array.from(new Set(rows.map((r) => r.planId)));
  const dayIds = Array.from(new Set(rows.map((r) => r.planDayId)));

  const programs = await DevelopmentProgram.findAll({
    where: { id: { [Op.in]: programIds } },
    attributes: ["id", "name", "nameAr"],
  });
  const days = await ProgramDaySession.findAll({
    where: { id: { [Op.in]: dayIds } },
    attributes: ["id", "label", "labelAr"],
    include: [{ model: ProgramExercise, as: "exercises", attributes: ["id"] }],
  });

  const programMap = new Map(programs.map((p) => [p.id, p]));
  const dayMap = new Map(
    days.map((d) => [
      d.id,
      {
        label: d.labelAr ?? d.label,
        count:
          (d as ProgramDaySession & { exercises?: ProgramExercise[] }).exercises
            ?.length ?? 0,
      },
    ]),
  );

  const data: WorkoutHistoryRow[] = rows.map((r) => {
    const program = programMap.get(r.planId);
    const day = dayMap.get(r.planDayId);
    return {
      id: r.id,
      programId: r.planId,
      daySessionId: r.planDayId,
      planName: program?.name ?? "—",
      planNameAr: program?.nameAr ?? null,
      dayLabel: day?.label ?? null,
      status: r.status,
      scheduledDate: r.scheduledDate,
      startedAt: r.startedAt ? r.startedAt.toISOString() : null,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      durationMin: r.durationMin,
      exerciseCount: day?.count ?? 0,
    };
  });

  return {
    data,
    meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

// ── Coach analytics ──

export async function getPlanAdherence(planId: string) {
  const plan = await WorkoutPlan.findByPk(planId);
  if (!plan) throw new AppError("Workout plan not found", 404);

  const today = toDateString(new Date());
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
