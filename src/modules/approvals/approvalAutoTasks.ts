/**
 * Approval Auto-Task Generator
 *
 * Real-time trigger:
 *  21. approval_rejected_action — request rejected → creator task to address
 *
 * Cron trigger:
 *  20. approval_step_overdue — active step past dueDate
 */

import { Op } from "sequelize";
import { ApprovalRequest } from "@modules/approvals/approval.model";
import { ApprovalStep } from "@modules/approvals/approvalStep.model";
import { User } from "@modules/users/user.model";
import {
  createAutoTaskIfNotExists,
  findUserByRole,
  cfg,
} from "@shared/utils/autoTaskHelpers";
import { logger } from "@config/logger";

// ── 21. Approval rejected → creator task ──

export async function generateApprovalRejectedTask(
  approvalId: string,
  decision: "Approved" | "Rejected",
) {
  if (decision !== "Rejected") return;

  const approval = await ApprovalRequest.findByPk(approvalId);
  if (!approval) return;

  await createAutoTaskIfNotExists(
    {
      ruleId: "approval_rejected_action",
      title: `Approval rejected: ${approval.entityTitle}`,
      titleAr: `تم رفض الموافقة: ${approval.entityTitle}`,
      description: `The approval request for "${approval.entityTitle}" (${approval.entityType}) was rejected. Review the feedback and take corrective action. Comment: ${(approval as any).comment || "None"}.`,
      descriptionAr: `تم رفض طلب الموافقة على "${approval.entityTitle}" (${approval.entityType}). مراجعة الملاحظات واتخاذ إجراء تصحيحي.`,
      type: "General",
      priority: "high",
      assignedTo: approval.requestedBy,
    },
    {
      userIds: [approval.requestedBy],
      link: "/dashboard/approvals",
    },
  );
}

// ── 20. Cron: approval step overdue ──

export async function checkApprovalStepOverdue(): Promise<{ created: number }> {
  const rc = cfg("approval_step_overdue");
  if (!rc.enabled) return { created: 0 };

  const today = new Date().toISOString().split("T")[0];

  // Find active steps past their due date
  const overdueSteps = await ApprovalStep.findAll({
    where: {
      status: "Active",
      dueDate: { [Op.lt]: today },
    },
    include: [
      {
        model: ApprovalRequest,
        as: "approval",
        attributes: ["id", "entityTitle", "entityType", "requestedBy"],
      },
    ],
  });

  let created = 0;
  for (const step of overdueSteps) {
    const approval = (step as any).approval;
    if (!approval) continue;

    // Find the approver — specific user or role-based
    let assignee: string | null = step.approverUserId ?? null;
    if (!assignee && step.approverRole) {
      const user = await findUserByRole(step.approverRole);
      assignee = user?.id ?? null;
    }

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "approval_step_overdue",
        title: `Overdue approval: ${approval.entityTitle}`,
        titleAr: `موافقة متأخرة: ${approval.entityTitle}`,
        description: `Approval step "${step.label || step.approverRole}" for "${approval.entityTitle}" is overdue (due: ${step.dueDate}). Complete the review immediately.`,
        descriptionAr: `خطوة الموافقة "${step.labelAr || step.label || step.approverRole}" على "${approval.entityTitle}" متأخرة. إكمال المراجعة فوراً.`,
        type: "General",
        priority: "critical",
        assignedTo: assignee,
      },
      {
        roles: step.approverRole ? [step.approverRole] : ["Admin"],
        userIds: assignee ? [assignee] : undefined,
        link: "/dashboard/approvals",
      },
    );
    if (task) created++;
  }

  return { created };
}
