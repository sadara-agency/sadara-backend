import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { sendSuccess, sendPaginated } from "../../shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "../../shared/utils/audit";
import { AppError } from "../../middleware/errorHandler";
import * as svc from "./approval.service";

// ── List Approvals ──

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listApprovalRequests(
    req.query,
    req.user!.id,
    req.user!.role,
  );
  sendPaginated(res, result.data, result.meta);
}

// ── Stats ──

export async function stats(req: AuthRequest, res: Response) {
  const data = await svc.getApprovalStats(req.user!.id, req.user!.role);
  sendSuccess(res, data);
}

// ── Approve ──

export async function approve(req: AuthRequest, res: Response) {
  const approval = await svc.resolveApproval(
    req.params.id,
    req.user!.id,
    "Approved",
    req.body.comment,
  );

  await logAudit(
    "UPDATE",
    "approval_requests",
    approval.id,
    buildAuditContext(req.user!, req.ip),
    `Approved: ${approval.entityTitle} (${approval.entityType}/${approval.entityId})`,
  );

  sendSuccess(res, approval, "Approval granted");
}

// ── Reject ──

export async function reject(req: AuthRequest, res: Response) {
  const approval = await svc.resolveApproval(
    req.params.id,
    req.user!.id,
    "Rejected",
    req.body.comment,
  );

  await logAudit(
    "UPDATE",
    "approval_requests",
    approval.id,
    buildAuditContext(req.user!, req.ip),
    `Rejected: ${approval.entityTitle} (${approval.entityType}/${approval.entityId})`,
  );

  sendSuccess(res, approval, "Approval rejected");
}
