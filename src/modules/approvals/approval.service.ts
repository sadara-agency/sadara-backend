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
        () => {},
      );
    } else if (input.assignedRole) {
      notifyByRole([input.assignedRole], notifPayload).catch(() => {});
    } else {
      notifyByRole(["Admin", "Manager"], notifPayload).catch(() => {});
    }
  }

  return approval;
}

// ── List ──

export async function listApprovalRequests(queryParams: any, userId: string, userRole: string) {
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
        include: [
          { model: User, as: "resolver", attributes: [...USER_ATTRS] },
        ],
      },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Stats ──

export async function getApprovalStats(userId: string, userRole: string) {
  const baseWhere: any = {};

  if (userRole === "Admin" || userRole === "Manager") {
    baseWhere[Op.or] = [
      { assignedTo: userId },
      { assignedRole: userRole },
      { assignedTo: null, assignedRole: null },
    ];
  } else {
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
  const approval = await ApprovalRequest.findByPk(id);
  if (!approval) throw new AppError("Approval request not found", 404);
  if (approval.status !== "Pending")
    throw new AppError("Approval already resolved", 409);

  // Multi-step: delegate to step resolution
  if (approval.totalSteps > 1) {
    if (!userRole) throw new AppError("User role required for multi-step approval", 400);
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
  }).catch(() => {});

  return approval;
}

// ── Resolve by entity (for hooks) ──

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

  // For entity-based resolution, auto-resolve all remaining steps
  if (approval.totalSteps > 1) {
    await ApprovalStep.update(
      {
        status: decision === "Approved" ? "Approved" : "Skipped",
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
      {
        where: {
          approvalRequestId: approval.id,
          status: { [Op.in]: ["Active", "Pending"] },
        },
      },
    );
  }

  await approval.update({
    status: decision,
    resolvedBy: userId,
    resolvedAt: new Date(),
  });

  return approval;
}

// ── Re-export detail query ──

export { getApprovalWithSteps };
