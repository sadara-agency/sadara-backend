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
import * as sessionService from "./session.service";

// ── List ──
export async function list(req: AuthRequest, res: Response) {
  const result = await sessionService.listSessions(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

// ── Get by ID ──
export async function getById(req: AuthRequest, res: Response) {
  const session = await sessionService.getSessionById(req.params.id);
  sendSuccess(res, session);
}

// ── Create ──
export async function create(req: AuthRequest, res: Response) {
  const session = await sessionService.createSession(req.body, req.user!.id);

  Promise.all([
    invalidateMultiple([
      CachePrefix.SESSIONS,
      CachePrefix.REFERRALS,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "CREATE",
      "sessions",
      session!.id,
      buildAuditContext(req.user!, req.ip),
      `Session created: ${session!.sessionType} for player ${session!.playerId}`,
    ),
  ]).catch(() => {});

  sendCreated(res, session, "Session created");
}

// ── Update ──
export async function update(req: AuthRequest, res: Response) {
  const session = await sessionService.updateSession(req.params.id, req.body);

  Promise.all([
    invalidateMultiple([
      CachePrefix.SESSIONS,
      CachePrefix.REFERRALS,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "UPDATE",
      "sessions",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      `Session updated`,
    ),
  ]).catch(() => {});

  sendSuccess(res, session, "Session updated");
}

// ── Delete ──
export async function remove(req: AuthRequest, res: Response) {
  const result = await sessionService.deleteSession(req.params.id);

  Promise.all([
    invalidateMultiple([
      CachePrefix.SESSIONS,
      CachePrefix.REFERRALS,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "DELETE",
      "sessions",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Session deleted",
    ),
  ]).catch(() => {});

  sendSuccess(res, result, "Session deleted");
}

// ── List by Referral ──
export async function listByReferral(req: AuthRequest, res: Response) {
  const result = await sessionService.listByReferral(
    req.params.referralId,
    req.query as any,
  );
  sendPaginated(res, result.data, result.meta);
}

// ── List by Player ──
export async function listByPlayer(req: AuthRequest, res: Response) {
  const result = await sessionService.listByPlayer(
    req.params.playerId,
    req.query as any,
  );
  sendPaginated(res, result.data, result.meta);
}

// ── Stats ──
export async function stats(req: AuthRequest, res: Response) {
  const data = await sessionService.getSessionStats();
  sendSuccess(res, data);
}
