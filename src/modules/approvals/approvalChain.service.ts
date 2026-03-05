import { Op } from "sequelize";
import { sequelize } from "../../config/database";
import {
  ApprovalChainTemplate,
  ApprovalChainTemplateStep,
} from "./approvalChainTemplate.model";
import { ApprovalStep } from "./approvalStep.model";
import { ApprovalRequest } from "./approval.model";
import { User } from "../Users/user.model";
import {
  createNotification,
  notifyByRole,
} from "../notifications/notification.service";
import { AppError } from "../../middleware/errorHandler";
import { logger } from "../../config/logger";
import type { CreateTemplateInput, UpdateTemplateInput } from "./approvalChain.schema";

const USER_ATTRS = ["id", "fullName", "role"] as const;

// ══════════════════════════════════════════════════════════
// Template CRUD
// ══════════════════════════════════════════════════════════

export async function listTemplates() {
  return ApprovalChainTemplate.findAll({
    include: [
      {
        model: ApprovalChainTemplateStep,
        as: "steps",
        order: [["step_number", "ASC"]],
      },
    ],
    order: [
      ["entityType", "ASC"],
      ["action", "ASC"],
    ],
  });
}

export async function createTemplate(input: CreateTemplateInput) {
  const t = await sequelize.transaction();
  try {
    // Deactivate existing active template for same (entityType, action)
    await ApprovalChainTemplate.update(
      { isActive: false },
      {
        where: {
          entityType: input.entityType,
          action: input.action,
          isActive: true,
        },
        transaction: t,
      },
    );

    const template = await ApprovalChainTemplate.create(
      {
        entityType: input.entityType,
        action: input.action,
        name: input.name,
        nameAr: input.nameAr ?? null,
        isActive: true,
      },
      { transaction: t },
    );

    // Create steps with proper numbering
    const steps = input.steps
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((s, idx) => ({
        templateId: template.id,
        stepNumber: idx + 1,
        approverRole: s.approverRole,
        label: s.label,
        labelAr: s.labelAr ?? null,
        dueDays: s.dueDays ?? 3,
        isMandatory: true,
      }));

    await ApprovalChainTemplateStep.bulkCreate(steps, { transaction: t });

    await t.commit();

    // Re-fetch with steps
    return ApprovalChainTemplate.findByPk(template.id, {
      include: [{ model: ApprovalChainTemplateStep, as: "steps" }],
    });
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function updateTemplate(id: string, input: UpdateTemplateInput) {
  const template = await ApprovalChainTemplate.findByPk(id);
  if (!template) throw new AppError("Template not found", 404);

  const t = await sequelize.transaction();
  try {
    if (input.name !== undefined) template.name = input.name;
    if (input.nameAr !== undefined) template.nameAr = input.nameAr;
    if (input.isActive !== undefined) template.isActive = input.isActive;
    await template.save({ transaction: t });

    if (input.steps) {
      // Replace steps
      await ApprovalChainTemplateStep.destroy({
        where: { templateId: id },
        transaction: t,
      });

      const steps = input.steps
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .map((s, idx) => ({
          templateId: id,
          stepNumber: idx + 1,
          approverRole: s.approverRole,
          label: s.label,
          labelAr: s.labelAr ?? null,
          dueDays: s.dueDays ?? 3,
          isMandatory: true,
        }));

      await ApprovalChainTemplateStep.bulkCreate(steps, { transaction: t });
    }

    await t.commit();

    return ApprovalChainTemplate.findByPk(id, {
      include: [{ model: ApprovalChainTemplateStep, as: "steps" }],
    });
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function deactivateTemplate(id: string) {
  const template = await ApprovalChainTemplate.findByPk(id);
  if (!template) throw new AppError("Template not found", 404);

  await template.update({ isActive: false });
  return template;
}

// ══════════════════════════════════════════════════════════
// Template Lookup
// ══════════════════════════════════════════════════════════

export async function findActiveTemplate(
  entityType: string,
  action: string,
): Promise<ApprovalChainTemplate | null> {
  return ApprovalChainTemplate.findOne({
    where: { entityType, action, isActive: true },
    include: [
      {
        model: ApprovalChainTemplateStep,
        as: "steps",
        order: [["step_number", "ASC"]],
      },
    ],
    order: [[{ model: ApprovalChainTemplateStep, as: "steps" }, "step_number", "ASC"]],
  });
}

// ══════════════════════════════════════════════════════════
// Step Creation (called from approval.service after creating parent)
// ══════════════════════════════════════════════════════════

export async function createStepsForApproval(
  approval: ApprovalRequest,
  template: ApprovalChainTemplate,
): Promise<ApprovalStep[]> {
  const templateSteps = (template.steps ?? []).sort(
    (a, b) => a.stepNumber - b.stepNumber,
  );

  if (templateSteps.length === 0) return [];

  const baseDueDate = approval.dueDate
    ? new Date(approval.dueDate)
    : new Date();

  let cumulativeDays = 0;

  const stepRecords = templateSteps.map((ts, idx) => {
    cumulativeDays += ts.dueDays;
    const dueDate = new Date(baseDueDate);
    dueDate.setDate(dueDate.getDate() + cumulativeDays);

    return {
      approvalRequestId: approval.id,
      stepNumber: ts.stepNumber,
      approverRole: ts.approverRole,
      status: idx === 0 ? ("Active" as const) : ("Pending" as const),
      label: ts.label,
      labelAr: ts.labelAr,
      dueDate: dueDate.toISOString().split("T")[0],
    };
  });

  const steps = await ApprovalStep.bulkCreate(stepRecords);

  // Update parent with chain info
  await approval.update({
    totalSteps: templateSteps.length,
    currentStep: 1,
    templateId: template.id,
  });

  // Notify step 1 role
  const firstStep = stepRecords[0];
  notifyByRole([firstStep.approverRole], {
    type: "system",
    title: `Approval needed: ${approval.entityTitle} (Step 1/${templateSteps.length})`,
    titleAr: `مطلوب موافقة: ${approval.entityTitle} (خطوة 1/${templateSteps.length})`,
    body: `${firstStep.label} — ${firstStep.approverRole}`,
    bodyAr: firstStep.labelAr || firstStep.label,
    link: "/dashboard/approvals",
    sourceType: "approval",
    sourceId: approval.id,
    priority: approval.priority || "normal",
  }).catch(() => {});

  return steps;
}

// ══════════════════════════════════════════════════════════
// Step Resolution
// ══════════════════════════════════════════════════════════

export async function resolveStep(
  approvalId: string,
  userId: string,
  userRole: string,
  decision: "Approved" | "Rejected",
  comment?: string,
): Promise<{ step: ApprovalStep; approval: ApprovalRequest }> {
  const approval = await ApprovalRequest.findByPk(approvalId, {
    include: [
      {
        model: ApprovalStep,
        as: "steps",
        order: [["step_number", "ASC"]],
      },
    ],
  });

  if (!approval) throw new AppError("Approval request not found", 404);
  if (approval.status !== "Pending")
    throw new AppError("Approval already resolved", 409);

  const steps = ((approval as any).steps ?? []) as ApprovalStep[];
  const activeStep = steps.find((s) => s.status === "Active");

  if (!activeStep) throw new AppError("No active step found", 409);

  // Validate role — Admin can approve any step, otherwise must match
  if (userRole !== "Admin" && userRole !== activeStep.approverRole) {
    throw new AppError(
      `Role '${userRole}' cannot act on this step (requires '${activeStep.approverRole}')`,
      403,
    );
  }

  // Resolve the step
  await activeStep.update({
    status: decision,
    resolvedBy: userId,
    resolvedAt: new Date(),
    comment: comment || null,
  });

  if (decision === "Approved") {
    // Find next pending step
    const nextStep = steps.find(
      (s) => s.stepNumber > activeStep.stepNumber && s.status === "Pending",
    );

    if (nextStep) {
      // Activate next step
      await nextStep.update({ status: "Active" });
      await approval.update({ currentStep: nextStep.stepNumber });

      // Notify next step role
      notifyByRole([nextStep.approverRole], {
        type: "system",
        title: `Approval needed: ${approval.entityTitle} (Step ${nextStep.stepNumber}/${approval.totalSteps})`,
        titleAr: `مطلوب موافقة: ${approval.entityTitle} (خطوة ${nextStep.stepNumber}/${approval.totalSteps})`,
        body: `${nextStep.label || nextStep.approverRole} review`,
        bodyAr: nextStep.labelAr || nextStep.label || nextStep.approverRole,
        link: "/dashboard/approvals",
        sourceType: "approval",
        sourceId: approval.id,
        priority: approval.priority || "normal",
      }).catch(() => {});
    } else {
      // Final step approved — resolve parent
      await approval.update({
        status: "Approved",
        resolvedBy: userId,
        resolvedAt: new Date(),
      });

      // Notify requester
      createNotification({
        userId: approval.requestedBy,
        type: "system",
        title: `Request approved: ${approval.entityTitle}`,
        titleAr: `تمت الموافقة: ${approval.entityTitle}`,
        link: "/dashboard/approvals",
        sourceType: "approval",
        sourceId: approval.id,
        priority: "normal",
      }).catch(() => {});
    }
  } else {
    // Rejected — reject parent and skip remaining steps
    await approval.update({
      status: "Rejected",
      resolvedBy: userId,
      resolvedAt: new Date(),
    });

    // Skip remaining pending steps
    await ApprovalStep.update(
      { status: "Skipped" },
      {
        where: {
          approvalRequestId: approvalId,
          status: { [Op.in]: ["Pending"] },
        },
      },
    );

    // Notify requester
    createNotification({
      userId: approval.requestedBy,
      type: "system",
      title: `Request rejected at Step ${activeStep.stepNumber}: ${approval.entityTitle}`,
      titleAr: `تم الرفض في الخطوة ${activeStep.stepNumber}: ${approval.entityTitle}`,
      body: `Rejected by ${activeStep.approverRole}${comment ? `: ${comment}` : ""}`,
      bodyAr: `تم الرفض من ${activeStep.approverRole}`,
      link: "/dashboard/approvals",
      sourceType: "approval",
      sourceId: approval.id,
      priority: "normal",
    }).catch(() => {});
  }

  return { step: activeStep, approval };
}

// ══════════════════════════════════════════════════════════
// Detail Query
// ══════════════════════════════════════════════════════════

export async function getApprovalWithSteps(approvalId: string) {
  const approval = await ApprovalRequest.findByPk(approvalId, {
    include: [
      { model: User, as: "requester", attributes: [...USER_ATTRS] },
      { model: User, as: "assignee", attributes: [...USER_ATTRS] },
      { model: User, as: "resolver", attributes: [...USER_ATTRS] },
      {
        model: ApprovalStep,
        as: "steps",
        include: [
          { model: User, as: "resolver", attributes: [...USER_ATTRS] },
          { model: User, as: "approverUser", attributes: [...USER_ATTRS] },
        ],
      },
    ],
    order: [[{ model: ApprovalStep, as: "steps" }, "step_number", "ASC"]],
  });

  if (!approval) throw new AppError("Approval request not found", 404);
  return approval;
}
