import { Op } from "sequelize";
import PostureAssessment from "./postureAssessment.model";
import type {
  CreatePostureAssessmentDTO,
  UpdatePostureAssessmentDTO,
  ListPostureAssessmentsQueryDTO,
} from "./postureAssessment.validation";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";

function buildDateRange(
  from?: string,
  to?: string,
): Record<symbol, string> | undefined {
  if (!from && !to) return undefined;
  const range: Record<symbol, string> = {};
  if (from) range[Op.gte as unknown as symbol] = from;
  if (to) range[Op.lte as unknown as symbol] = to;
  return range;
}

export async function listPostureAssessments(
  query: ListPostureAssessmentsQueryDTO,
  user?: AuthUser,
) {
  const { page, limit, playerId, from, to } = query;
  const where: Record<string, unknown> = {};

  if (playerId) where.playerId = playerId;
  const range = buildDateRange(from, to);
  if (range) where.scanDate = range;

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await PostureAssessment.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["scanDate", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function listPostureAssessmentsForPlayer(
  playerId: string,
  query: ListPostureAssessmentsQueryDTO,
  user?: AuthUser,
) {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) throw new AppError("Posture assessment not found", 404);

  const { page, limit, from, to } = query;
  const where: Record<string, unknown> = { playerId };
  const range = buildDateRange(from, to);
  if (range) where.scanDate = range;

  const { rows, count } = await PostureAssessment.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["scanDate", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getLatestPostureAssessmentForPlayer(
  playerId: string,
  user?: AuthUser,
) {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) throw new AppError("Posture assessment not found", 404);

  return PostureAssessment.findOne({
    where: { playerId },
    order: [["scanDate", "DESC"]],
  });
}

export async function getPostureAssessmentById(id: string, user?: AuthUser) {
  const item = await PostureAssessment.findByPk(id);
  if (!item) throw new AppError("Posture assessment not found", 404);

  const allowed = await checkRowAccess("wellness", item, user);
  if (!allowed) throw new AppError("Posture assessment not found", 404);

  return item;
}

export async function createPostureAssessment(
  data: CreatePostureAssessmentDTO,
  userId: string,
) {
  const item = await PostureAssessment.create({ ...data, recordedBy: userId });

  invalidateMultiple([CachePrefix.POSTURE, CachePrefix.WELLNESS]).catch(
    () => {},
  );

  return item;
}

export async function updatePostureAssessment(
  id: string,
  data: UpdatePostureAssessmentDTO,
  user?: AuthUser,
) {
  const item = await getPostureAssessmentById(id, user);
  await item.update(data);

  invalidateMultiple([CachePrefix.POSTURE, CachePrefix.WELLNESS]).catch(
    () => {},
  );

  return item;
}

export async function deletePostureAssessment(id: string, user?: AuthUser) {
  const item = await getPostureAssessmentById(id, user);
  await item.destroy();

  invalidateMultiple([CachePrefix.POSTURE, CachePrefix.WELLNESS]).catch(
    () => {},
  );

  return { id };
}
