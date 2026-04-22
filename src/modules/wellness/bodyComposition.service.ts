import { Op } from "sequelize";
import BodyComposition from "./bodyComposition.model";
import type {
  CreateScanDTO,
  UpdateScanDTO,
  ListScansQueryDTO,
} from "./bodyComposition.validation";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { issueNewVersion } from "./nutritionPrescription.service";
import { logger } from "@config/logger";

function buildDateRange(from?: string, to?: string): Record<symbol, string> {
  const range: Record<symbol, string> = {};
  if (from) range[Op.gte as unknown as symbol] = from;
  if (to) range[Op.lte as unknown as symbol] = to;
  return range;
}

export async function listScans(query: ListScansQueryDTO, user?: AuthUser) {
  const { page, limit, from, to } = query;
  const where: any = {};

  if (from || to) where.scanDate = buildDateRange(from, to);

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await BodyComposition.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["scanDate", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function listScansForPlayer(
  playerId: string,
  query: ListScansQueryDTO,
  user?: AuthUser,
) {
  const { page, limit, from, to } = query;
  const where: any = { playerId };

  if (from || to) where.scanDate = buildDateRange(from, to);

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await BodyComposition.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["scanDate", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getScanById(id: string, user?: AuthUser) {
  const scan = await BodyComposition.findByPk(id);
  if (!scan) throw new AppError("Scan not found", 404);

  const allowed = await checkRowAccess("wellness", scan, user);
  if (!allowed) throw new AppError("Scan not found", 404);

  return scan;
}

export async function createScan(data: CreateScanDTO, userId: string) {
  const existing = await BodyComposition.findOne({
    where: { playerId: data.playerId, scanDate: data.scanDate },
  });
  if (existing) throw new AppError("Scan already exists for this date", 409);

  const scan = await BodyComposition.create({ ...data, recordedBy: userId });

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  issueNewVersion(scan.playerId, "scan", scan.id, userId).catch((err) =>
    logger.error("Prescription reissue failed after scan creation", err),
  );

  return scan;
}

export async function updateScan(id: string, data: UpdateScanDTO) {
  const scan = await getScanById(id);

  if (data.scanDate && data.scanDate !== scan.scanDate) {
    const conflict = await BodyComposition.findOne({
      where: { playerId: scan.playerId, scanDate: data.scanDate },
    });
    if (conflict) throw new AppError("Scan already exists for this date", 409);
  }

  await scan.update(data);

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return scan;
}

export async function deleteScan(id: string) {
  const scan = await getScanById(id);
  await scan.destroy();

  invalidateMultiple([CachePrefix.WELLNESS, CachePrefix.DASHBOARD]).catch(
    () => {},
  );

  return { id };
}

export async function getLatestScan(playerId: string, user?: AuthUser) {
  // Row-access check: treat as a minimal record for scope evaluation
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) throw new AppError("Scan not found", 404);

  const scan = await BodyComposition.findOne({
    where: { playerId },
    order: [["scanDate", "DESC"]],
  });

  if (!scan) throw new AppError("No scans found for this player", 404);

  return scan;
}
