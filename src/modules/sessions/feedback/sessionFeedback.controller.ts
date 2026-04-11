import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple } from "@shared/utils/cache";
import { CachePrefix } from "@shared/utils/cache";
import * as feedbackService from "./sessionFeedback.service";

// ── List by Session ──
export async function listBySession(req: AuthRequest, res: Response) {
  const result = await feedbackService.listBySession(
    req.params.sessionId,
    req.query as any,
  );
  sendPaginated(res, result.data, result.meta);
}

// ── Get by ID ──
export async function getById(req: AuthRequest, res: Response) {
  const feedback = await feedbackService.getFeedbackById(req.params.feedbackId);
  sendSuccess(res, feedback);
}

// ── Create ──
export async function create(req: AuthRequest, res: Response) {
  const feedback = await feedbackService.createFeedback(
    req.params.sessionId,
    req.body,
    req.user!.id,
  );

  Promise.all([
    invalidateMultiple([
      CachePrefix.SESSIONS,
      CachePrefix.SESSION_FEEDBACK,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "CREATE",
      "session-feedback",
      feedback!.id,
      buildAuditContext(req.user!, req.ip),
      `Feedback submitted for session ${req.params.sessionId}`,
    ),
  ]).catch(() => {});

  sendCreated(res, feedback, "Session feedback submitted");
}

// ── Update ──
export async function update(req: AuthRequest, res: Response) {
  const feedback = await feedbackService.updateFeedback(
    req.params.feedbackId,
    req.body,
  );

  Promise.all([
    invalidateMultiple([
      CachePrefix.SESSIONS,
      CachePrefix.SESSION_FEEDBACK,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "UPDATE",
      "session-feedback",
      req.params.feedbackId,
      buildAuditContext(req.user!, req.ip),
      "Session feedback updated",
    ),
  ]).catch(() => {});

  sendSuccess(res, feedback, "Session feedback updated");
}

// ── Delete ──
export async function remove(req: AuthRequest, res: Response) {
  const result = await feedbackService.deleteFeedback(req.params.feedbackId);

  Promise.all([
    invalidateMultiple([
      CachePrefix.SESSIONS,
      CachePrefix.SESSION_FEEDBACK,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "DELETE",
      "session-feedback",
      req.params.feedbackId,
      buildAuditContext(req.user!, req.ip),
      "Session feedback deleted",
    ),
  ]).catch(() => {});

  sendSuccess(res, result, "Session feedback deleted");
}

// ── Player Summary ──
export async function playerSummary(req: AuthRequest, res: Response) {
  const { dateFrom, dateTo } = req.query as {
    dateFrom?: string;
    dateTo?: string;
  };
  const data = await feedbackService.getPlayerFeedbackSummary(
    req.params.playerId,
    dateFrom,
    dateTo,
  );
  sendSuccess(res, data);
}
