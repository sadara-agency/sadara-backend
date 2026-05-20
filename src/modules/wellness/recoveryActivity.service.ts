import { Op } from "sequelize";
import RecoveryActivity from "./recoveryActivity.model";
import type {
  CreateRecoveryActivityDTO,
  UpdateRecoveryActivityDTO,
  ListRecoveryActivityQueryDTO,
} from "./recoveryActivity.validation";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDateRange(from?: string, to?: string): Record<symbol, string> {
  const range: Record<symbol, string> = {};
  if (from) range[Op.gte as unknown as symbol] = from;
  if (to) range[Op.lte as unknown as symbol] = to;
  return range;
}

export async function listRecoveryActivities(
  query: ListRecoveryActivityQueryDTO,
  user?: AuthUser,
) {
  const { page, limit, from, to } = query;
  const where: any = {};

  if (from || to) where.activityDate = buildDateRange(from, to);

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await RecoveryActivity.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["activityDate", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getRecoveryActivityById(id: string, user?: AuthUser) {
  const item = await RecoveryActivity.findByPk(id);
  if (!item) throw new AppError("Recovery activity not found", 404);

  const allowed = await checkRowAccess("wellness", item, user);
  if (!allowed) throw new AppError("Recovery activity not found", 404);

  return item;
}

export async function createRecoveryActivity(
  data: CreateRecoveryActivityDTO,
  userId: string,
) {
  const existing = await RecoveryActivity.findOne({
    where: { playerId: data.playerId, activityDate: data.activityDate },
  });
  if (existing)
    throw new AppError("Recovery activity already exists for this date", 409);

  const item = await RecoveryActivity.create({ ...data, recordedBy: userId });

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return item;
}

export async function updateRecoveryActivity(
  id: string,
  data: UpdateRecoveryActivityDTO,
) {
  const item = await getRecoveryActivityById(id);

  if (data.activityDate && data.activityDate !== item.activityDate) {
    const conflict = await RecoveryActivity.findOne({
      where: { playerId: item.playerId, activityDate: data.activityDate },
    });
    if (conflict)
      throw new AppError("Recovery activity already exists for this date", 409);
  }

  await item.update(data);

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return item;
}

export async function deleteRecoveryActivity(id: string) {
  const item = await getRecoveryActivityById(id);
  await item.destroy();

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return { id };
}

export interface TodayRecoverySummary {
  saunaMinutes: number | null;
  poolMinutes: number | null;
  walkMinutes: number | null;
}

/**
 * Today's recovery totals for a single player. Returns null fields when no
 * row exists for today so the UI renders a graceful empty state.
 */
export async function getTodayRecoveryForPlayer(
  playerId: string,
  user?: AuthUser,
): Promise<TodayRecoverySummary | null> {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) throw new AppError("Recovery activity not found", 404);

  const item = await RecoveryActivity.findOne({
    where: { playerId, activityDate: todayLocal() },
  });

  if (!item) return null;

  return {
    saunaMinutes: item.saunaMinutes ?? null,
    poolMinutes: item.poolMinutes ?? null,
    walkMinutes: item.walkMinutes ?? null,
  };
}

export async function listRecoveryForPlayer(
  playerId: string,
  query: ListRecoveryActivityQueryDTO,
  user?: AuthUser,
) {
  const { page, limit, from, to } = query;
  const where: any = { playerId };

  if (from || to) where.activityDate = buildDateRange(from, to);

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await RecoveryActivity.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["activityDate", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}
