import Supplement from "./supplement.model";
import type {
  CreateSupplementDTO,
  UpdateSupplementDTO,
  ListSupplementsQueryDTO,
} from "./supplement.validation";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";

export async function listSupplements(
  query: ListSupplementsQueryDTO,
  user?: AuthUser,
) {
  const { page, limit, playerId, isActive } = query;
  const where: Record<string, unknown> = {};

  if (playerId) where.playerId = playerId;
  if (isActive !== undefined) where.isActive = isActive;

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await Supplement.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [
      ["priority", "ASC"],
      ["timing", "ASC"],
      ["name", "ASC"],
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function listSupplementsForPlayer(
  playerId: string,
  user?: AuthUser,
) {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) throw new AppError("Supplement not found", 404);

  return Supplement.findAll({
    where: { playerId, isActive: true },
    order: [
      ["priority", "ASC"],
      ["timing", "ASC"],
      ["name", "ASC"],
    ],
  });
}

export async function getSupplementById(id: string, user?: AuthUser) {
  const item = await Supplement.findByPk(id);
  if (!item) throw new AppError("Supplement not found", 404);

  const allowed = await checkRowAccess("wellness", item, user);
  if (!allowed) throw new AppError("Supplement not found", 404);

  return item;
}

export async function createSupplement(
  data: CreateSupplementDTO,
  userId: string,
) {
  const item = await Supplement.create({ ...data, createdBy: userId });

  invalidateMultiple([CachePrefix.SUPPLEMENTS, CachePrefix.WELLNESS]).catch(
    () => {},
  );

  return item;
}

export async function updateSupplement(
  id: string,
  data: UpdateSupplementDTO,
  user?: AuthUser,
) {
  const item = await getSupplementById(id, user);
  await item.update(data);

  invalidateMultiple([CachePrefix.SUPPLEMENTS, CachePrefix.WELLNESS]).catch(
    () => {},
  );

  return item;
}

export async function deleteSupplement(id: string, user?: AuthUser) {
  const item = await getSupplementById(id, user);
  await item.destroy();

  invalidateMultiple([CachePrefix.SUPPLEMENTS, CachePrefix.WELLNESS]).catch(
    () => {},
  );

  return { id };
}
