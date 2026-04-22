import { Op } from "sequelize";
import TrainingBlock from "./trainingBlock.model";
import type {
  OpenBlockDTO,
  UpdateBlockDTO,
  CloseBlockDTO,
  PauseBlockDTO,
  ListBlocksQueryDTO,
} from "./trainingBlock.validation";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function buildDateRange(from?: string, to?: string): Record<symbol, string> {
  const range: Record<symbol, string> = {};
  if (from) range[Op.gte as unknown as symbol] = from;
  if (to) range[Op.lte as unknown as symbol] = to;
  return range;
}

export async function listBlocks(query: ListBlocksQueryDTO, user?: AuthUser) {
  const { page, limit, playerId, status, from, to } = query;
  const where: any = {};
  if (playerId) where.playerId = playerId;
  if (status) where.status = status;
  if (from || to) where.startedAt = buildDateRange(from, to);

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await TrainingBlock.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["startedAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function listBlocksForPlayer(
  playerId: string,
  query: ListBlocksQueryDTO,
  user?: AuthUser,
) {
  const { page, limit, status, from, to } = query;
  const where: any = { playerId };
  if (status) where.status = status;
  if (from || to) where.startedAt = buildDateRange(from, to);

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await TrainingBlock.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["startedAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getBlockById(id: string, user?: AuthUser) {
  const block = await TrainingBlock.findByPk(id);
  if (!block) throw new AppError("Training block not found", 404);

  const allowed = await checkRowAccess("wellness", block, user);
  if (!allowed) throw new AppError("Training block not found", 404);

  return block;
}

export async function getActiveBlock(
  playerId: string,
  user?: AuthUser,
): Promise<TrainingBlock | null> {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) return null;

  return TrainingBlock.findOne({
    where: { playerId, status: "active" },
  });
}

export async function openBlock(data: OpenBlockDTO, userId: string) {
  const startedAt = data.startedAt ?? today();
  const plannedEndAt = addDays(startedAt, data.durationWeeks * 7);

  // Preflight: at most one active block per player
  const existing = await TrainingBlock.findOne({
    where: { playerId: data.playerId, status: "active" },
  });
  if (existing) {
    throw new AppError("Player already has an active training block", 409);
  }

  let block: TrainingBlock;
  try {
    block = await TrainingBlock.create({
      ...data,
      startedAt,
      plannedEndAt,
      createdBy: userId,
    });
  } catch (err: any) {
    // Postgres unique-violation fallback (race condition)
    if (err?.parent?.code === "23505") {
      throw new AppError("Player already has an active training block", 409);
    }
    throw err;
  }

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return block;
}

export async function updateBlock(id: string, data: UpdateBlockDTO) {
  const block = await getBlockById(id);

  if (data.startedAt || data.durationWeeks) {
    const startedAt = data.startedAt ?? block.startedAt;
    const durationWeeks = data.durationWeeks ?? block.durationWeeks;
    (data as any).plannedEndAt = addDays(startedAt, durationWeeks * 7);
  }

  await block.update(data);

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return block;
}

export async function pauseBlock(id: string, data?: PauseBlockDTO) {
  const block = await getBlockById(id);

  if (block.status !== "active") {
    throw new AppError("Only active blocks can be paused", 422);
  }

  await block.update({
    status: "paused",
    pausedAt: today(),
    ...(data?.notes !== undefined && { notes: data.notes }),
  });

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return block;
}

export async function resumeBlock(id: string) {
  const block = await getBlockById(id);

  if (block.status !== "paused") {
    throw new AppError("Only paused blocks can be resumed", 422);
  }

  // Edge case: another block may have become active while this one was paused
  const conflict = await TrainingBlock.findOne({
    where: {
      playerId: block.playerId,
      status: "active",
      id: { [Op.ne]: id } as any,
    },
  });
  if (conflict) {
    throw new AppError("Player already has an active training block", 409);
  }

  await block.update({ status: "active", pausedAt: null });

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return block;
}

export async function closeBlock(
  id: string,
  data: CloseBlockDTO,
  userId: string,
) {
  const block = await getBlockById(id);

  if (block.status === "closed") {
    throw new AppError("Training block is already closed", 422);
  }

  await block.update({
    status: "closed",
    closedAt: data.closedAt ?? today(),
    closedBy: userId,
    ...(data.endScanId !== undefined && { endScanId: data.endScanId }),
    ...(data.notes !== undefined && { notes: data.notes }),
  });

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return block;
}

export async function deleteBlock(id: string) {
  const block = await getBlockById(id);
  await block.destroy();

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return { id };
}
