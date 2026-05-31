import { Response, NextFunction } from "express";
import type { AuthRequest } from "@shared/types";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import { invalidateByPrefix, CachePrefix } from "@shared/utils/cache";
import * as service from "./matchEventTag.service";

export async function listTags(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.listTagsForMatch(
      req.params.matchId,
      req.query as never,
    );
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getSummary(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getSummaryForMatch(req.params.matchId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function createTag(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.createTag(
      req.params.matchId,
      req.body,
      req.user!.id,
    );
    await invalidateByPrefix(CachePrefix.MATCH_EVENT_TAGS);
    return sendCreated(res, data, "Event tag created");
  } catch (err) {
    next(err);
  }
}

export async function deleteTag(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.deleteTag(req.params.tagId);
    await invalidateByPrefix(CachePrefix.MATCH_EVENT_TAGS);
    return sendSuccess(res, data, "Event tag deleted");
  } catch (err) {
    next(err);
  }
}
