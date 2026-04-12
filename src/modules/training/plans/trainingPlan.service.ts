import { Op } from "sequelize";
import {
  TrainingPlan,
  TrainingPlanWeek,
  TrainingPlanProgress,
} from "./trainingPlan.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateTrainingPlanInput,
  UpdateTrainingPlanInput,
  TrainingPlanQuery,
  UpsertWeekInput,
  LogProgressInput,
} from "./trainingPlan.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "position",
  "photoUrl",
] as const;
const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

function planIncludes(withWeeks = false) {
  const base = [
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    {
      model: User,
      as: "creator",
      attributes: [...USER_ATTRS],
      required: false,
    },
  ];
  if (withWeeks) {
    base.push({
      model: TrainingPlanWeek,
      as: "weeks",
    } as any);
  }
  return base;
}

// ── List ──

export async function listTrainingPlans(query: TrainingPlanQuery) {
  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.status) where.status = query.status;
  if (query.periodType) where.periodType = query.periodType;

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await TrainingPlan.findAndCountAll({
    where,
    order: [["startDate", "DESC"]],
    limit: query.limit,
    offset,
    include: planIncludes(),
    distinct: true,
  });

  return {
    data: rows,
    meta: {
      total: count,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(count / query.limit),
    },
  };
}

// ── Get by ID (with weeks + progress) ──

export async function getTrainingPlanById(id: string) {
  const plan = await TrainingPlan.findByPk(id, {
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      {
        model: User,
        as: "creator",
        attributes: [...USER_ATTRS],
        required: false,
      },
      {
        model: TrainingPlanWeek,
        as: "weeks",
        separate: true,
        order: [["weekNumber", "ASC"]],
      } as any,
      {
        model: TrainingPlanProgress,
        as: "progressLogs",
        separate: true,
        order: [["loggedDate", "DESC"]],
      } as any,
    ],
  });
  if (!plan) throw new AppError("Training plan not found", 404);
  return plan;
}

// ── Get active plan for player ──

export async function getActivePlan(playerId: string) {
  return TrainingPlan.findOne({
    where: { playerId, status: "active" },
    order: [["startDate", "DESC"]],
    include: planIncludes(true),
  });
}

// ── Create ──

export async function createTrainingPlan(
  body: CreateTrainingPlanInput,
  userId: string,
) {
  if (body.startDate >= body.endDate) {
    throw new AppError("End date must be after start date", 422);
  }
  const plan = await TrainingPlan.create({ ...body, createdBy: userId });
  return getTrainingPlanById(plan.id);
}

// ── Update ──

export async function updateTrainingPlan(
  id: string,
  body: UpdateTrainingPlanInput,
) {
  const plan = await TrainingPlan.findByPk(id);
  if (!plan) throw new AppError("Training plan not found", 404);
  await plan.update(body);
  return getTrainingPlanById(id);
}

// ── Delete ──

export async function deleteTrainingPlan(id: string) {
  const plan = await TrainingPlan.findByPk(id);
  if (!plan) throw new AppError("Training plan not found", 404);
  await plan.destroy();
  return { id };
}

// ── Upsert week ──

export async function upsertWeek(planId: string, body: UpsertWeekInput) {
  const plan = await TrainingPlan.findByPk(planId);
  if (!plan) throw new AppError("Training plan not found", 404);

  const [week, created] = await TrainingPlanWeek.findOrCreate({
    where: { planId, weekNumber: body.weekNumber },
    defaults: { planId, ...body },
  });

  if (!created) {
    await week.update(body);
  }

  return week;
}

// ── Log progress ──

export async function logWeekProgress(
  planId: string,
  body: LogProgressInput,
  userId: string,
) {
  const plan = await TrainingPlan.findByPk(planId);
  if (!plan) throw new AppError("Training plan not found", 404);

  const log = await TrainingPlanProgress.create({
    planId,
    ...body,
    createdBy: userId,
  });
  return log;
}

// ── Progression report ──

export async function getProgressionReport(planId: string) {
  const plan = await TrainingPlan.findByPk(planId, {
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      {
        model: TrainingPlanWeek,
        as: "weeks",
        separate: true,
        order: [["weekNumber", "ASC"]],
      } as any,
      {
        model: TrainingPlanProgress,
        as: "progressLogs",
        separate: true,
        order: [["loggedDate", "ASC"]],
      } as any,
    ],
  });
  if (!plan) throw new AppError("Training plan not found", 404);

  const logs = (plan.get("progressLogs") as TrainingPlanProgress[]) ?? [];
  const weeks = (plan.get("weeks") as TrainingPlanWeek[]) ?? [];

  const totalWeeks = weeks.length;
  const loggedWeeks = new Set(logs.map((l) => l.weekNumber)).size;
  const avgCompletion =
    logs.length > 0
      ? parseFloat(
          (
            logs.reduce((sum, l) => sum + Number(l.completionPct), 0) /
            logs.length
          ).toFixed(1),
        )
      : 0;

  // Week-by-week completion map
  const weekCompletion = weeks.map((w) => {
    const weekLogs = logs.filter((l) => l.weekNumber === w.weekNumber);
    const latest = weekLogs[0];
    return {
      weekNumber: w.weekNumber,
      theme: w.theme,
      intensity: w.intensity,
      completionPct: latest ? Number(latest.completionPct) : null,
      lastLogged: latest?.loggedDate ?? null,
    };
  });

  return {
    plan,
    summary: {
      totalWeeks,
      loggedWeeks,
      avgCompletion,
      progressPct:
        totalWeeks > 0 ? Math.round((loggedWeeks / totalWeeks) * 100) : 0,
    },
    weekCompletion,
    recentLogs: logs.slice(0, 5),
  };
}

// ── List progress logs ──

export async function listProgressLogs(planId: string) {
  const plan = await TrainingPlan.findByPk(planId);
  if (!plan) throw new AppError("Training plan not found", 404);

  return TrainingPlanProgress.findAll({
    where: { planId },
    order: [["loggedDate", "DESC"]],
  });
}
