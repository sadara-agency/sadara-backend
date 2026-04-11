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
import * as svc from "./devReview.service";

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.listDevReviews(req.query as any);
  sendPaginated(res, result.data, result.meta);
});

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await svc.getDevReviewById(req.params.id);
  sendSuccess(res, review);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await svc.createDevReview(req.body, req.user!.id);
  Promise.all([
    invalidateMultiple([CachePrefix.DEV_REVIEWS, CachePrefix.DASHBOARD]),
    logAudit(
      "CREATE",
      "development_reviews",
      review.id,
      buildAuditContext(req.user!, req.ip),
      `Dev review: ${review.quarterLabel} for player ${review.playerId}`,
    ),
  ]).catch(() => {});
  sendCreated(res, review);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await svc.updateDevReview(req.params.id, req.body);
  Promise.all([
    invalidateMultiple([CachePrefix.DEV_REVIEWS]),
    logAudit(
      "UPDATE",
      "development_reviews",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Development review updated",
    ),
  ]).catch(() => {});
  sendSuccess(res, review);
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.deleteDevReview(req.params.id);
  Promise.all([
    invalidateMultiple([CachePrefix.DEV_REVIEWS, CachePrefix.DASHBOARD]),
    logAudit(
      "DELETE",
      "development_reviews",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Development review deleted",
    ),
  ]).catch(() => {});
  sendSuccess(res, result);
});

export const submit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await svc.submitReview(req.params.id);
  Promise.all([
    invalidateMultiple([CachePrefix.DEV_REVIEWS]),
    logAudit(
      "UPDATE",
      "development_reviews",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Development review submitted",
    ),
  ]).catch(() => {});
  sendSuccess(res, review);
});

export const acknowledge = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const review = await svc.acknowledgeReview(req.params.id);
    Promise.all([
      invalidateMultiple([CachePrefix.DEV_REVIEWS]),
      logAudit(
        "UPDATE",
        "development_reviews",
        req.params.id,
        buildAuditContext(req.user!, req.ip),
        "Development review acknowledged by player",
      ),
    ]).catch(() => {});
    sendSuccess(res, review);
  },
);

export const generateTemplate = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { playerId, quarterLabel } = req.body;
    const review = await svc.generateReviewTemplate(
      playerId,
      quarterLabel,
      req.user!.id,
    );
    Promise.all([
      invalidateMultiple([CachePrefix.DEV_REVIEWS]),
      logAudit(
        "CREATE",
        "development_reviews",
        review.id,
        buildAuditContext(req.user!, req.ip),
        `Template generated: ${quarterLabel}`,
      ),
    ]).catch(() => {});
    sendCreated(res, review);
  },
);
