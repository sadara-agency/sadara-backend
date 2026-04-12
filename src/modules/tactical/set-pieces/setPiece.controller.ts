import { Response } from "express";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { asyncHandler } from "@middleware/errorHandler";
import type { AuthRequest } from "@shared/types";
import * as svc from "./setPiece.service";

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.listSetPieces(req.query as any);
  sendPaginated(res, result.data, result.meta);
});

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await svc.getSetPieceById(req.params.id);
  sendSuccess(res, record);
});

export const matchSummary = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const summary = await svc.getMatchSetPieceSummary(req.params.matchId);
    sendSuccess(res, summary);
  },
);

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await svc.createSetPiece(req.body, req.user!.id);
  Promise.all([
    invalidateMultiple([CachePrefix.SET_PIECES, CachePrefix.TACTICAL]),
    logAudit(
      "CREATE",
      "set_piece_events",
      record.id,
      buildAuditContext(req.user!, req.ip),
      `Set piece logged: ${record.type}`,
    ),
  ]).catch(() => {});
  sendCreated(res, record);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await svc.updateSetPiece(req.params.id, req.body);
  Promise.all([
    invalidateMultiple([CachePrefix.SET_PIECES, CachePrefix.TACTICAL]),
    logAudit(
      "UPDATE",
      "set_piece_events",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Set piece updated",
    ),
  ]).catch(() => {});
  sendSuccess(res, record);
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.deleteSetPiece(req.params.id);
  Promise.all([
    invalidateMultiple([CachePrefix.SET_PIECES, CachePrefix.TACTICAL]),
    logAudit(
      "DELETE",
      "set_piece_events",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Set piece deleted",
    ),
  ]).catch(() => {});
  sendSuccess(res, result);
});
