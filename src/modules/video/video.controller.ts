import { Response, NextFunction } from "express";
import type { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { invalidateByPrefix, CachePrefix } from "@shared/utils/cache";
import * as videoService from "./video.service";

// ── Clips ──

export async function listClips(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await videoService.listClips(req.query as never);
    return sendPaginated(res, result.data, result.meta);
  } catch (err) {
    next(err);
  }
}

export async function getClip(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await videoService.getClipById(req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function createClip(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await videoService.createClip(req.body, req.user!.id);
    await invalidateByPrefix(CachePrefix.VIDEO_CLIPS);
    return sendCreated(res, data, "Video clip created");
  } catch (err) {
    next(err);
  }
}

export async function updateClip(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await videoService.updateClip(req.params.id, req.body);
    await invalidateByPrefix(CachePrefix.VIDEO_CLIPS);
    return sendSuccess(res, data, "Video clip updated");
  } catch (err) {
    next(err);
  }
}

export async function deleteClip(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await videoService.deleteClip(req.params.id);
    await invalidateByPrefix(CachePrefix.VIDEO_CLIPS);
    return sendSuccess(res, data, "Video clip deleted");
  } catch (err) {
    next(err);
  }
}

// ── Tags ──

export async function listTags(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await videoService.listTagsForClip(req.params.clipId);
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
    const data = await videoService.createTag(
      req.params.clipId,
      req.body,
      req.user!.id,
    );
    await invalidateByPrefix(CachePrefix.VIDEO_TAGS);
    return sendCreated(res, data, "Tag added");
  } catch (err) {
    next(err);
  }
}

export async function updateTag(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await videoService.updateTag(req.params.tagId, req.body);
    await invalidateByPrefix(CachePrefix.VIDEO_TAGS);
    return sendSuccess(res, data, "Tag updated");
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
    const data = await videoService.deleteTag(req.params.tagId);
    await invalidateByPrefix(CachePrefix.VIDEO_TAGS);
    return sendSuccess(res, data, "Tag deleted");
  } catch (err) {
    next(err);
  }
}

export async function getTagSummary(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await videoService.getTagSummaryForClip(req.params.clipId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
