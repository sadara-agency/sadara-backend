import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { AppError } from "@middleware/errorHandler";
import * as svc from "@modules/approvals/approval.service";
import * as chainSvc from "@modules/approvals/approvalChain.service";
import {
  createTemplateSchema,
  updateTemplateSchema,
} from "@modules/approvals/approvalChain.validation";

// ── List Approvals ──

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listApprovalRequests(
    req.query,
    req.user!.id,
    req.user!.role,
  );
  sendPaginated(res, result.data, result.meta);
}

// ── Detail ──

export async function detail(req: AuthRequest, res: Response) {
  const data = await svc.getApprovalWithSteps(req.params.id);
  sendSuccess(res, data);
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
    req.user!.role,
  );

  await logAudit(
    "UPDATE",
    "approval_requests",
    approval.id,
    buildAuditContext(req.user!, req.ip),
    `Approved: ${approval.entityTitle} (${approval.entityType}/${approval.entityId})` +
      (approval.totalSteps > 1
        ? ` — Step ${approval.currentStep}/${approval.totalSteps}`
        : ""),
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
    req.user!.role,
  );

  await logAudit(
    "UPDATE",
    "approval_requests",
    approval.id,
    buildAuditContext(req.user!, req.ip),
    `Rejected: ${approval.entityTitle} (${approval.entityType}/${approval.entityId})` +
      (approval.totalSteps > 1
        ? ` — Step ${approval.currentStep}/${approval.totalSteps}`
        : ""),
  );

  sendSuccess(res, approval, "Approval rejected");
}

// ══════════════════════════════════════════════════════════
// Template Management (Admin only)
// ══════════════════════════════════════════════════════════

export async function listTemplates(_req: AuthRequest, res: Response) {
  const data = await chainSvc.listTemplates();
  sendSuccess(res, data);
}

export async function createTemplate(req: AuthRequest, res: Response) {
  const { body } = createTemplateSchema.parse(req);
  const template = await chainSvc.createTemplate(body);

  await logAudit(
    "CREATE",
    "approval_chain_templates",
    template!.id,
    buildAuditContext(req.user!, req.ip),
    `Created approval chain template: ${body.name} (${body.entityType}/${body.action})`,
  );

  sendSuccess(res, template, "Template created", 201);
}

export async function updateTemplate(req: AuthRequest, res: Response) {
  const { body } = updateTemplateSchema.parse(req);
  const template = await chainSvc.updateTemplate(req.params.id, body);

  await logAudit(
    "UPDATE",
    "approval_chain_templates",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Updated approval chain template: ${template!.name}`,
  );

  sendSuccess(res, template, "Template updated");
}

export async function deactivateTemplate(req: AuthRequest, res: Response) {
  const template = await chainSvc.deactivateTemplate(req.params.id);

  await logAudit(
    "DELETE",
    "approval_chain_templates",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Deactivated approval chain template: ${template.name}`,
  );

  sendSuccess(res, template, "Template deactivated");
}
