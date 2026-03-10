import { Op } from "sequelize";
import { ApprovalRequest, ApprovalStatus } from "./approval.model";
import { ApprovalStep } from "./approvalStep.model";
import { User } from "../Users/user.model";
import { parsePagination, buildMeta } from "../../shared/utils/pagination";
import {
  createNotification,
  notifyByRole,
} from "../notifications/notification.service";
import { logger } from "../../config/logger";
import { AppError } from "../../middleware/errorHandler";
import { findOrThrow } from "../../shared/utils/serviceHelpers";
import {
  findActiveTemplate,
  createStepsForApproval,
  resolveStep,
  getApprovalWithSteps,
} from "./approvalChain.service";

const USER_ATTRS = ["id", "fullName", "role"] as const;

// ── Types ──

interface CreateApprovalInput {
  entityType: string;
  entityId: string;
  entityTitle: string;
  action: string;
  requestedBy: string;
  assignedTo?: string;
  assignedRole?: string;
  priority?: "low" | "normal" | "high" | "critical";
  dueDate?: string;
}

// ── Create ──

export async function createApprovalRequest(input: CreateApprovalInput) {
  // Prevent duplicates: only one Pending approval per entity
  const existing = await ApprovalRequest.findOne({
    where: {
      entityType: input.entityType,
      entityId: input.entityId,
      status: "Pending",
    },
  });
  if (existing) return existing;

  const approval = await ApprovalRequest.create(input as any);

  // Check for a multi-step template
  const template = await findActiveTemplate(input.entityType, input.action);

  if (template && template.steps && template.steps.length > 0) {
    // Multi-step: create steps from template (handles notification for step 1)
    await createStepsForApproval(approval, template);
  } else {
    // Single-step: send generic notification (existing behavior)
    const notifPayload = {
      type: "system" as const,
      title: `Approval needed: ${input.entityTitle}`,
      titleAr: `مطلوب موافقة: ${input.entityTitle}`,
      body: `Action: ${input.action}`,
      bodyAr: `الإجراء: ${input.action}`,
      link: "/dashboard/approvals",
      sourceType: "approval",
      sourceId: approval.id,
      priority: input.priority || ("normal" as const),
    };

    if (input.assignedTo) {
      createNotification({ ...notifPayload, userId: input.assignedTo }).catch(
        (err) =>
          logger.warn("Approval notification failed", {
            error: (err as Error).message,
          }),
      );
    } else if (input.assignedRole) {
      notifyByRole([input.assignedRole], notifPayload).catch((err) =>
        logger.warn("Approval role notification failed", {
          error: (err as Error).message,
        }),
      );
    } else {
      notifyByRole(["Admin", "Manager"], notifPayload).catch((err) =>
        logger.warn("Approval notification failed", {
          error: (err as Error).message,
        }),
      );
    }
  }

  return approval;
}

// ── List ──

export async function listApprovalRequests(
  queryParams: any,
  userId: string,
  userRole: string,
) {
  const { limit, offset, page, sort, order } = parsePagination(
    queryParams,
    "createdAt",
  );

  const where: any = {};

  // Role-based visibility
  if (userRole === "Admin" || userRole === "Manager") {
    if (!queryParams.showAll) {
      where[Op.or] = [
        { assignedTo: userId },
        { assignedRole: userRole },
        { assignedTo: null, assignedRole: null },
      ];
    }
  } else {
    where.requestedBy = userId;
  }

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.entityType) where.entityType = queryParams.entityType;
  if (queryParams.priority) where.priority = queryParams.priority;

  if (queryParams.search) {
    where.entityTitle = { [Op.iLike]: `%${queryParams.search}%` };
  }

  const { count, rows } = await ApprovalRequest.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [
      { model: User, as: "requester", attributes: [...USER_ATTRS] },
      { model: User, as: "assignee", attributes: [...USER_ATTRS] },
      { model: User, as: "resolver", attributes: [...USER_ATTRS] },
      {
        model: ApprovalStep,
        as: "steps",
        include: [{ model: User, as: "resolver", attributes: [...USER_ATTRS] }],
      },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Stats ──

export async function getApprovalStats(userId: string, userRole: string) {
  const baseWhere: any = {};

  // Admin/Manager see stats for ALL approvals (consistent with list?showAll behavior)
  if (userRole !== "Admin" && userRole !== "Manager") {
    baseWhere.requestedBy = userId;
  }

  const [pending, approved, rejected, overdue] = await Promise.all([
    ApprovalRequest.count({ where: { ...baseWhere, status: "Pending" } }),
    ApprovalRequest.count({ where: { ...baseWhere, status: "Approved" } }),
    ApprovalRequest.count({ where: { ...baseWhere, status: "Rejected" } }),
    ApprovalRequest.count({
      where: {
        ...baseWhere,
        status: "Pending",
        dueDate: { [Op.lt]: new Date() },
      },
    }),
  ]);

  return { pending, approved, rejected, overdue };
}

// ── Resolve ──

export async function resolveApproval(
  id: string,
  userId: string,
  decision: "Approved" | "Rejected",
  comment?: string,
  userRole?: string,
) {
  const approval = await findOrThrow(ApprovalRequest, id, "Approval request");
  if (approval.status !== "Pending")
    throw new AppError("Approval already resolved", 409);

  // Multi-step: delegate to step resolution
  if (approval.totalSteps > 1) {
    if (!userRole)
      throw new AppError("User role required for multi-step approval", 400);
    const result = await resolveStep(id, userId, userRole, decision, comment);
    return result.approval;
  }

  // Single-step: resolve directly (existing behavior)
  await approval.update({
    status: decision,
    resolvedBy: userId,
    resolvedAt: new Date(),
    comment: comment || null,
  });

  // Notify requester
  const statusLabel = decision === "Approved" ? "approved" : "rejected";
  const statusLabelAr = decision === "Approved" ? "تمت الموافقة" : "تم الرفض";
  createNotification({
    userId: approval.requestedBy,
    type: "system",
    title: `Request ${statusLabel}: ${approval.entityTitle}`,
    titleAr: `${statusLabelAr}: ${approval.entityTitle}`,
    link: `/dashboard/approvals`,
    sourceType: "approval",
    sourceId: approval.id,
    priority: "normal",
  }).catch((err) =>
    logger.warn("Approval resolution notification failed", {
      error: (err as Error).message,
    }),
  );

  return approval;
}

// ── Resolve by entity (for hooks) ──
// Only resolves single-step approvals directly.
// Multi-step approvals must be resolved through the approval chain UI step-by-step.

export async function resolveApprovalByEntity(
  entityType: string,
  entityId: string,
  userId: string,
  decision: "Approved" | "Rejected",
) {
  const approval = await ApprovalRequest.findOne({
    where: { entityType, entityId, status: "Pending" },
  });
  if (!approval) return null;

  // Multi-step approvals cannot be bypassed — they must go through the chain
  if (approval.totalSteps > 1) {
    logger.warn(
      `resolveApprovalByEntity skipped: multi-step approval ${approval.id} ` +
        `(${entityType}/${entityId}) must be resolved through the approval chain`,
    );
    return null;
  }

  await approval.update({
    status: decision,
    resolvedBy: userId,
    resolvedAt: new Date(),
  });

  return approval;
}

// ── Check if entity's approval chain is fully resolved ──

export async function isApprovalChainResolved(
  entityType: string,
  entityId: string,
): Promise<{
  resolved: boolean;
  status: "Approved" | "Rejected" | "Pending" | "none";
}> {
  const approval = await ApprovalRequest.findOne({
    where: { entityType, entityId },
    order: [["createdAt", "DESC"]],
  });

  if (!approval) return { resolved: true, status: "none" };
  if (approval.status === "Approved")
    return { resolved: true, status: "Approved" };
  if (approval.status === "Rejected")
    return { resolved: true, status: "Rejected" };

  return { resolved: false, status: "Pending" };
}

// ── Re-export detail query ──

export { getApprovalWithSteps };
