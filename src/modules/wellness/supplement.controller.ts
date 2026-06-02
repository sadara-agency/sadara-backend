import type { Response } from "express";
import {
  sendSuccess,
  sendPaginated,
  sendCreated,
} from "@shared/utils/apiResponse";
import { CachePrefix } from "@shared/utils/cache";
import type { AuthRequest } from "@shared/types";
import * as supplementService from "./supplement.service";

export async function list(req: AuthRequest, res: Response): Promise<void> {
  const result = await supplementService.listSupplements(
    req.query as Parameters<typeof supplementService.listSupplements>[0],
    req.user,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function listForPlayer(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const data = await supplementService.listSupplementsForPlayer(
    req.params.playerId,
    req.user,
  );
  sendSuccess(res, data);
}

export async function getById(req: AuthRequest, res: Response): Promise<void> {
  const data = await supplementService.getSupplementById(
    req.params.id,
    req.user,
  );
  sendSuccess(res, data);
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const data = await supplementService.createSupplement(req.body, req.user!.id);
  sendCreated(res, data, "Supplement created");
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  const data = await supplementService.updateSupplement(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, data, "Supplement updated");
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  const data = await supplementService.deleteSupplement(
    req.params.id,
    req.user,
  );
  sendSuccess(res, data, "Supplement deleted");
}

// Unused export — satisfies the CachePrefix import for barrel consistency
export { CachePrefix };
