import { Op } from "sequelize";
import AgendaGoal from "./agenda-goal.model";
import AgendaTask from "./agenda-task.model";
import { AppError } from "@middleware/errorHandler";
import { getRedisClient } from "@config/redis";
import { logger } from "@config/logger";
import type {
  CreateGoalDTO,
  UpdateGoalDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  RolloverDecisionDTO,
} from "./agenda.validation";

const ACTIVE_GOAL_CAP = 50;
const MAX_ROLLOVER_COUNT = 3;

// ── Goal services ──

export async function listGoals(
  userId: string,
  query: { month?: string; status?: string; page: number; limit: number },
) {
  const where: Record<string, unknown> = { userId };
  if (query.month) where.targetMonth = query.month;
  if (query.status) where.status = query.status;

  const { rows, count } = await AgendaGoal.findAndCountAll({
    where,
    order: [
      ["sortOrder", "ASC"],
      ["createdAt", "DESC"],
    ],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: count,
      totalPages: Math.ceil(count / query.limit),
    },
  };
}

export async function getGoalById(id: string, userId: string) {
  const goal = await AgendaGoal.findOne({ where: { id, userId } });
  if (!goal) throw new AppError("Goal not found", 404);
  return goal;
}

export async function getGoalProgress(
  goalId: string,
  userId: string,
): Promise<number> {
  const redis = getRedisClient();
  const cacheKey = `agenda:progress:${goalId}`;

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached !== null) return parseFloat(cached);
  }

  const goal = await getGoalById(goalId, userId);

  let progress = 0;

  if (goal.progressMode === "manual_percent") {
    progress = goal.manualPercent ?? 0;
  } else if (goal.progressMode === "numeric_target") {
    const target = Number(goal.targetValue) || 0;
    progress =
      target > 0
        ? Math.min(100, (Number(goal.currentValue) / target) * 100)
        : 0;
  } else {
    // task_count
    const total = await AgendaTask.count({
      where: { goalId, status: { [Op.notIn]: ["Abandoned"] } },
    });
    const done = await AgendaTask.count({
      where: { goalId, status: "Done" },
    });
    progress = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  if (redis) {
    await redis.set(cacheKey, String(progress), "EX", 60);
  }

  return progress;
}

export async function createGoal(data: CreateGoalDTO, userId: string) {
  const activeCount = await AgendaGoal.count({
    where: { userId, status: "active" },
  });
  if (activeCount >= ACTIVE_GOAL_CAP) {
    throw new AppError(
      "Goal limit reached. Archive older goals to create new ones.",
      400,
    );
  }

  const goal = await AgendaGoal.create({ ...data, userId });
  return goal;
}

export async function updateGoal(
  id: string,
  data: UpdateGoalDTO,
  userId: string,
) {
  const goal = await getGoalById(id, userId);
  await goal.update(data);

  const redis = getRedisClient();
  if (redis) await redis.del(`agenda:progress:${id}`);

  return goal;
}

export async function deleteGoal(id: string, userId: string) {
  const goal = await getGoalById(id, userId);
  await AgendaTask.update({ goalId: null }, { where: { goalId: id } });
  await goal.destroy();
  return { id };
}

// ── Task services ──

export async function listTasks(
  userId: string,
  query: {
    goalId?: string;
    status?: string;
    priority?: string;
    dueFrom?: string;
    dueTo?: string;
    needsRolloverDecision?: boolean;
    page: number;
    limit: number;
  },
) {
  const where: Record<string, any> = { userId };
  if (query.goalId) where.goalId = query.goalId;
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.needsRolloverDecision !== undefined)
    where.needsRolloverDecision = query.needsRolloverDecision;
  if (query.dueFrom || query.dueTo) {
    where.dueDate = {};
    if (query.dueFrom) where.dueDate[Op.gte] = query.dueFrom;
    if (query.dueTo) where.dueDate[Op.lte] = query.dueTo;
  }

  const { rows, count } = await AgendaTask.findAndCountAll({
    where,
    order: [
      ["dueDate", "ASC"],
      ["sortOrder", "ASC"],
      ["priority", "ASC"],
    ],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: count,
      totalPages: Math.ceil(count / query.limit),
    },
  };
}

export async function getTaskById(id: string, userId: string) {
  const task = await AgendaTask.findOne({ where: { id, userId } });
  if (!task) throw new AppError("Task not found", 404);
  return task;
}

export async function getTodayTasks(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const tasks = await AgendaTask.findAll({
    where: {
      userId,
      dueDate: today,
      status: { [Op.in]: ["Open", "InProgress"] },
    },
    order: [
      ["sortOrder", "ASC"],
      ["dueTime", "ASC"],
    ],
  });

  const rolloverPending = await AgendaTask.findAll({
    where: {
      userId,
      needsRolloverDecision: true,
      status: { [Op.in]: ["Open", "InProgress"] },
    },
    order: [["dueDate", "ASC"]],
  });

  return { today: tasks, rolloverPending };
}

export async function createTask(data: CreateTaskDTO, userId: string) {
  if (data.goalId) {
    const goal = await AgendaGoal.findOne({
      where: { id: data.goalId, userId },
    });
    if (!goal) throw new AppError("Goal not found", 404);
  }

  const task = await AgendaTask.create({ ...data, userId });

  // If timed, create a calendar event (fire-and-forget)
  if (data.dueTime) {
    syncTaskToCalendar(task).catch((err) =>
      logger.error("[AGENDA] Calendar sync failed on create", {
        taskId: task.id,
        error: (err as Error).message,
      }),
    );
  }

  return task;
}

export async function updateTask(
  id: string,
  data: UpdateTaskDTO,
  userId: string,
) {
  const task = await getTaskById(id, userId);
  const prevStatus = task.status;
  const prevDueTime = task.dueTime;

  if (data.status === "Done" && prevStatus !== "Done") {
    data = { ...data, completedAt: new Date() } as UpdateTaskDTO & {
      completedAt: Date;
    };
  }

  await task.update(data);

  const redis = getRedisClient();
  if (task.goalId && redis) {
    await redis.del(`agenda:progress:${task.goalId}`);
  }

  // Re-sync calendar if timing changed
  const timingChanged =
    data.dueDate !== undefined ||
    data.dueTime !== undefined ||
    data.title !== undefined ||
    data.durationMinutes !== undefined;

  if (timingChanged) {
    syncTaskToCalendar(task).catch((err) =>
      logger.error("[AGENDA] Calendar sync failed on update", {
        taskId: task.id,
        error: (err as Error).message,
      }),
    );
  }

  // If task had a dueTime removed, delete the calendar event
  if (prevDueTime && !task.dueTime && task.calendarEventId) {
    removeCalendarEvent(task.calendarEventId).catch(() => null);
    await task.update({ calendarEventId: null });
  }

  return task;
}

export async function deleteTask(id: string, userId: string) {
  const task = await getTaskById(id, userId);

  if (task.calendarEventId) {
    removeCalendarEvent(task.calendarEventId).catch(() => null);
  }

  const goalId = task.goalId;
  await task.destroy();

  const redis = getRedisClient();
  if (goalId && redis) {
    await redis.del(`agenda:progress:${goalId}`);
  }

  return { id };
}

export async function resolveRollover(
  data: RolloverDecisionDTO,
  userId: string,
) {
  const task = await getTaskById(data.id, userId);
  if (!task.needsRolloverDecision) {
    throw new AppError("Task does not need a rollover decision", 400);
  }

  if (data.decision === "skip") {
    await task.update({
      status: "Skipped",
      needsRolloverDecision: false,
    });
  } else if (data.decision === "reschedule") {
    if (!data.newDueDate) {
      throw new AppError("newDueDate required for reschedule", 422);
    }
    await task.update({
      dueDate: data.newDueDate,
      needsRolloverDecision: false,
      rolloverCount: task.rolloverCount,
    });
  } else {
    // keep — move to today
    const today = new Date().toISOString().split("T")[0];
    await task.update({
      dueDate: today,
      needsRolloverDecision: false,
      rolloverCount: task.rolloverCount + 1,
    });
  }

  return task.reload();
}

export async function getShouldGreet(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  const key = `agenda:lastView:${userId}`;
  const exists = await redis.exists(key);
  return exists === 0;
}

export async function markViewed(userId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  // TTL 18 hours — covers a full working day
  await redis.set(`agenda:lastView:${userId}`, "1", "EX", 18 * 3600);
}

// ── Cron-called rollover ──

export async function rolloverOverdueTasks(): Promise<{
  rolled: number;
  flagged: number;
  abandoned: number;
}> {
  const today = new Date().toISOString().split("T")[0];

  const overdue = await AgendaTask.findAll({
    where: {
      status: { [Op.in]: ["Open", "InProgress"] },
      dueDate: { [Op.lt]: today },
      needsRolloverDecision: false,
    },
  });

  let rolled = 0;
  let flagged = 0;
  let abandoned = 0;

  for (const task of overdue) {
    if (task.rolloverCount >= MAX_ROLLOVER_COUNT) {
      await task.update({ status: "Abandoned", abandonedAt: new Date() });
      abandoned++;
    } else if (task.rolloverPolicy === "auto") {
      await task.update({
        dueDate: today,
        rolloverCount: task.rolloverCount + 1,
      });
      rolled++;
      // Notify user (fire-and-forget)
      notifyRollover(task.userId, task.title).catch(() => null);
    } else if (task.rolloverPolicy === "ask") {
      await task.update({ needsRolloverDecision: true });
      flagged++;
    }
    // "none" policy — leave as-is (will be picked up on next pass until abandoned)
  }

  logger.info("[AGENDA] Rollover complete", { rolled, flagged, abandoned });
  return { rolled, flagged, abandoned };
}

// ── Calendar sync helpers (imported by agenda.calendarSync.ts) ──

export async function syncFromEvent(
  taskId: string,
  update: { startDate: Date; endDate?: Date },
) {
  const task = await AgendaTask.findByPk(taskId);
  if (!task) return;

  const newDueDate = update.startDate.toISOString().split("T")[0];
  const newDueTime = update.startDate.toTimeString().slice(0, 5); // HH:MM
  let durationMinutes: number | undefined;

  if (update.endDate) {
    durationMinutes = Math.round(
      (update.endDate.getTime() - update.startDate.getTime()) / 60000,
    );
  }

  // Use _skipSync flag to prevent the afterUpdate hook from re-syncing
  (task as unknown as Record<string, unknown>)._skipSync = true;
  await task.update({
    dueDate: newDueDate,
    dueTime: newDueTime,
    ...(durationMinutes !== undefined && { durationMinutes }),
  });
}

// ── Internal helpers ──

async function syncTaskToCalendar(task: AgendaTask) {
  const { createOrUpdateEventForTask } = await import("./agenda.calendarSync");
  await createOrUpdateEventForTask(task);
}

async function removeCalendarEvent(eventId: string) {
  const { deleteEventForTask } = await import("./agenda.calendarSync");
  await deleteEventForTask(eventId);
}

async function notifyRollover(userId: string, taskTitle: string) {
  const { dispatchAgendaNotification } = await import("./agenda.notifications");
  await dispatchAgendaNotification(userId, {
    type: "task",
    priority: "normal",
    title: `Task rolled over: ${taskTitle}`,
    titleAr: `تم تأجيل المهمة: ${taskTitle}`,
    body: "Your task was automatically moved to today.",
    bodyAr: "تم نقل مهمتك تلقائيًا إلى اليوم.",
  });
}
