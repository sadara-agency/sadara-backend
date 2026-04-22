import { Op } from "sequelize";
import { DevelopmentSession } from "./developmentSession.model";
import {
  DevelopmentProgram,
  ProgramExercise,
} from "./developmentProgram.model";
import { WellnessExercise } from "./fitness.model";
import type {
  CreateSessionDTO,
  UpdateSessionDTO,
  CompleteSessionDTO,
  ListSessionsQueryDTO,
} from "./developmentSession.validation";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import { checkRowAccess } from "@shared/utils/rowScope";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";

export async function listSessions(query: ListSessionsQueryDTO) {
  const { page, limit, playerId, programId, status, from, to } = query;
  const where: any = {};

  if (playerId) where.playerId = playerId;
  if (programId) where.programId = programId;
  if (status) where.status = status;
  if (from || to) {
    where.scheduledDate = {};
    if (from) where.scheduledDate[Op.gte] = from;
    if (to) where.scheduledDate[Op.lte] = to;
  }

  const { rows, count } = await DevelopmentSession.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["scheduledDate", "DESC"]],
    include: [{ model: DevelopmentProgram, as: "program", required: false }],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function listSessionsForPlayer(
  playerId: string,
  query: ListSessionsQueryDTO,
  user?: AuthUser,
) {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed)
    return { data: [], meta: buildMeta(0, query.page, query.limit) };

  return listSessions({ ...query, playerId });
}

export async function getSessionById(
  id: string,
  user?: AuthUser,
): Promise<DevelopmentSession> {
  const session = await DevelopmentSession.findByPk(id, {
    include: [
      {
        model: DevelopmentProgram,
        as: "program",
        required: false,
        include: [
          {
            model: ProgramExercise,
            as: "exercises",
            include: [{ model: WellnessExercise, as: "exercise" }],
            order: [["orderIndex", "ASC"]],
            separate: true,
          },
        ],
      },
    ],
  });
  if (!session) throw new AppError("Session not found", 404);

  const allowed = await checkRowAccess(
    "wellness",
    { playerId: session.playerId },
    user,
  );
  if (!allowed) throw new AppError("Session not found", 404);

  return session;
}

export async function createSession(
  data: CreateSessionDTO,
  userId: string,
): Promise<DevelopmentSession> {
  const session = await DevelopmentSession.create({
    ...data,
    prescribedBy: userId,
  });
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return session;
}

export async function completeSession(
  id: string,
  data: CompleteSessionDTO,
): Promise<DevelopmentSession> {
  const session = await DevelopmentSession.findByPk(id);
  if (!session) throw new AppError("Session not found", 404);

  if (session.status === "completed") {
    throw new AppError("Session is already completed", 422);
  }

  await session.update({
    status: data.status,
    overallRpe: data.overallRpe ?? null,
    actualDurationMinutes: data.actualDurationMinutes ?? null,
    sessionNote: data.sessionNote ?? null,
    completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
  });

  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return session;
}

export async function updateSession(
  id: string,
  data: UpdateSessionDTO,
): Promise<DevelopmentSession> {
  const session = await DevelopmentSession.findByPk(id);
  if (!session) throw new AppError("Session not found", 404);
  await session.update(data);
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return session;
}

export async function deleteSession(id: string): Promise<{ id: string }> {
  const session = await DevelopmentSession.findByPk(id);
  if (!session) throw new AppError("Session not found", 404);
  await session.destroy();
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return { id };
}
