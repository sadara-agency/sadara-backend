import RehabProtocol, {
  RehabPhase,
  RehabPhaseExercise,
} from "./rehabProtocol.model";
import type {
  CreateRehabProtocolDTO,
  UpdateRehabProtocolDTO,
  ListRehabProtocolsQueryDTO,
  CreateRehabPhaseDTO,
  UpdateRehabPhaseDTO,
  CreateRehabPhaseExerciseDTO,
  UpdateRehabPhaseExerciseDTO,
} from "./rehabProtocol.validation";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";

const PHASE_INCLUDE = {
  model: RehabPhase,
  as: "phases",
  include: [{ model: RehabPhaseExercise, as: "exercises" }],
  order: [["orderIndex", "ASC"]],
};

// ── Protocols ──

export async function listRehabProtocols(
  query: ListRehabProtocolsQueryDTO,
  user?: AuthUser,
) {
  const { page, limit, playerId, status } = query;
  const where: Record<string, unknown> = {};

  if (playerId) where.playerId = playerId;
  if (status) where.status = status;

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await RehabProtocol.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["createdAt", "DESC"]],
    include: [PHASE_INCLUDE as never],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function listRehabProtocolsForPlayer(
  playerId: string,
  user?: AuthUser,
) {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) throw new AppError("Rehab protocol not found", 404);

  return RehabProtocol.findAll({
    where: { playerId },
    order: [["createdAt", "DESC"]],
    include: [PHASE_INCLUDE as never],
  });
}

export async function getRehabProtocolById(id: string, user?: AuthUser) {
  const item = await RehabProtocol.findByPk(id, {
    include: [PHASE_INCLUDE as never],
  });
  if (!item) throw new AppError("Rehab protocol not found", 404);

  const allowed = await checkRowAccess("wellness", item, user);
  if (!allowed) throw new AppError("Rehab protocol not found", 404);

  return item;
}

export async function createRehabProtocol(
  data: CreateRehabProtocolDTO,
  userId: string,
) {
  const item = await RehabProtocol.create({ ...data, createdBy: userId });
  invalidateMultiple([CachePrefix.REHAB, CachePrefix.WELLNESS]).catch(() => {});
  return item;
}

export async function updateRehabProtocol(
  id: string,
  data: UpdateRehabProtocolDTO,
  user?: AuthUser,
) {
  const item = await getRehabProtocolById(id, user);
  await item.update(data);
  invalidateMultiple([CachePrefix.REHAB, CachePrefix.WELLNESS]).catch(() => {});
  return item;
}

export async function deleteRehabProtocol(id: string, user?: AuthUser) {
  const item = await getRehabProtocolById(id, user);
  await item.destroy();
  invalidateMultiple([CachePrefix.REHAB, CachePrefix.WELLNESS]).catch(() => {});
  return { id };
}

export async function grantClearance(
  id: string,
  grantedBy: string,
  user?: AuthUser,
) {
  const item = await getRehabProtocolById(id, user);
  if (!item.clearanceRequired)
    throw new AppError("Clearance not required for this protocol", 422);
  await item.update({
    clearanceGranted: true,
    clearanceGrantedBy: grantedBy,
    clearanceGrantedAt: new Date(),
  });
  invalidateMultiple([CachePrefix.REHAB]).catch(() => {});
  return item;
}

// ── Phases ──

async function getPhase(protocolId: string, phaseId: string, user?: AuthUser) {
  await getRehabProtocolById(protocolId, user);
  const phase = await RehabPhase.findOne({
    where: { id: phaseId, protocolId },
  });
  if (!phase) throw new AppError("Rehab phase not found", 404);
  return phase;
}

export async function addPhase(
  protocolId: string,
  data: CreateRehabPhaseDTO,
  user?: AuthUser,
) {
  await getRehabProtocolById(protocolId, user);
  const phase = await RehabPhase.create({ ...data, protocolId });
  invalidateMultiple([CachePrefix.REHAB]).catch(() => {});
  return phase;
}

export async function updatePhase(
  protocolId: string,
  phaseId: string,
  data: UpdateRehabPhaseDTO,
  user?: AuthUser,
) {
  const phase = await getPhase(protocolId, phaseId, user);
  await phase.update(data);
  invalidateMultiple([CachePrefix.REHAB]).catch(() => {});
  return phase;
}

export async function deletePhase(
  protocolId: string,
  phaseId: string,
  user?: AuthUser,
) {
  const phase = await getPhase(protocolId, phaseId, user);
  await phase.destroy();
  invalidateMultiple([CachePrefix.REHAB]).catch(() => {});
  return { id: phaseId };
}

// ── Phase Exercises ──

async function getPhaseExercise(
  protocolId: string,
  phaseId: string,
  exerciseId: string,
  user?: AuthUser,
) {
  await getPhase(protocolId, phaseId, user);
  const ex = await RehabPhaseExercise.findOne({
    where: { id: exerciseId, phaseId },
  });
  if (!ex) throw new AppError("Rehab phase exercise not found", 404);
  return ex;
}

export async function addPhaseExercise(
  protocolId: string,
  phaseId: string,
  data: CreateRehabPhaseExerciseDTO,
  user?: AuthUser,
) {
  await getPhase(protocolId, phaseId, user);
  const ex = await RehabPhaseExercise.create({ ...data, phaseId });
  invalidateMultiple([CachePrefix.REHAB]).catch(() => {});
  return ex;
}

export async function updatePhaseExercise(
  protocolId: string,
  phaseId: string,
  exerciseId: string,
  data: UpdateRehabPhaseExerciseDTO,
  user?: AuthUser,
) {
  const ex = await getPhaseExercise(protocolId, phaseId, exerciseId, user);
  await ex.update(data);
  invalidateMultiple([CachePrefix.REHAB]).catch(() => {});
  return ex;
}

export async function deletePhaseExercise(
  protocolId: string,
  phaseId: string,
  exerciseId: string,
  user?: AuthUser,
) {
  const ex = await getPhaseExercise(protocolId, phaseId, exerciseId, user);
  await ex.destroy();
  invalidateMultiple([CachePrefix.REHAB]).catch(() => {});
  return { id: exerciseId };
}
