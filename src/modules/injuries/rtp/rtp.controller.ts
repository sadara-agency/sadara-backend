import { Response } from "express";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import type { AuthRequest } from "@shared/types";
import * as rtpService from "./rtp.service";

export async function list(req: AuthRequest, res: Response) {
  const result = await rtpService.listRtpProtocols(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const protocol = await rtpService.getRtpProtocolById(req.params.id);
  sendSuccess(res, protocol);
}

export async function getByInjury(req: AuthRequest, res: Response) {
  const protocol = await rtpService.getRtpProtocolByInjury(req.params.injuryId);
  sendSuccess(res, protocol ?? null);
}

export async function create(req: AuthRequest, res: Response) {
  const protocol = await rtpService.createRtpProtocol(req.body, req.user!.id);
  Promise.all([
    invalidateMultiple([
      CachePrefix.RTP,
      CachePrefix.INJURIES,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "CREATE",
      "rtp_protocols",
      protocol.id,
      buildAuditContext(req.user!, req.ip),
      `RTP protocol created for injury ${protocol.injuryId}`,
    ),
  ]).catch(() => {});
  sendCreated(res, protocol);
}

export async function update(req: AuthRequest, res: Response) {
  const protocol = await rtpService.updateRtpProtocol(req.params.id, req.body);
  Promise.all([
    invalidateMultiple([CachePrefix.RTP, CachePrefix.INJURIES]),
    logAudit(
      "UPDATE",
      "rtp_protocols",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "RTP protocol updated",
    ),
  ]).catch(() => {});
  sendSuccess(res, protocol);
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await rtpService.deleteRtpProtocol(req.params.id);
  Promise.all([
    invalidateMultiple([
      CachePrefix.RTP,
      CachePrefix.INJURIES,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "DELETE",
      "rtp_protocols",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "RTP protocol deleted",
    ),
  ]).catch(() => {});
  sendSuccess(res, result);
}

export async function advancePhase(req: AuthRequest, res: Response) {
  const protocol = await rtpService.advancePhase(
    req.params.id,
    req.user!.id,
    req.body,
  );
  Promise.all([
    invalidateMultiple([CachePrefix.RTP, CachePrefix.INJURIES]),
    logAudit(
      "UPDATE",
      "rtp_protocols",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      `Phase advanced to ${protocol.currentPhase}`,
    ),
  ]).catch(() => {});
  sendSuccess(res, protocol);
}
