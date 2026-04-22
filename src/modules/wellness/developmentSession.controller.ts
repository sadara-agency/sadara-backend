import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import * as svc from "./developmentSession.service";

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listSessions(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const session = await svc.getSessionById(req.params.id, req.user);
  sendSuccess(res, session);
}

export async function create(req: AuthRequest, res: Response) {
  const session = await svc.createSession(req.body, req.user!.id);
  sendCreated(res, session);
  logAudit(
    "CREATE",
    "wellness",
    session.id,
    buildAuditContext(req.user!, req.ip),
    `Scheduled ${session.sessionType} session for player ${session.playerId}`,
  ).catch(() => {});
}

export async function update(req: AuthRequest, res: Response) {
  const session = await svc.updateSession(req.params.id, req.body);
  sendSuccess(res, session, "Session updated");
  logAudit(
    "UPDATE",
    "wellness",
    session.id,
    buildAuditContext(req.user!, req.ip),
    `Updated session ${req.params.id}`,
  ).catch(() => {});
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deleteSession(req.params.id);
  sendSuccess(res, result, "Session deleted");
  logAudit(
    "DELETE",
    "wellness",
    result.id,
    buildAuditContext(req.user!, req.ip),
    `Deleted session ${result.id}`,
  ).catch(() => {});
}

export async function listForPlayer(req: AuthRequest, res: Response) {
  const result = await svc.listSessionsForPlayer(
    req.params.playerId,
    req.query as any,
    req.user,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function complete(req: AuthRequest, res: Response) {
  const session = await svc.completeSession(req.params.id, req.body);
  sendSuccess(res, session, "Session completed");
  logAudit(
    "UPDATE",
    "wellness",
    session.id,
    buildAuditContext(req.user!, req.ip),
    `Completed session ${req.params.id} (status: ${session.status})`,
  ).catch(() => {});
}
