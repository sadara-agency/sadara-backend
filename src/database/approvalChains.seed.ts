import {
  ApprovalChainTemplate,
  ApprovalChainTemplateStep,
} from "../modules/approvals/approvalChainTemplate.model";
import { logger } from "../config/logger";

interface TemplateSeed {
  entityType: string;
  action: string;
  name: string;
  nameAr: string;
  steps: Array<{
    stepNumber: number;
    approverRole: string;
    label: string;
    labelAr: string;
    dueDays: number;
  }>;
}

const TEMPLATES: TemplateSeed[] = [
  {
    entityType: "contract",
    action: "review",
    name: "Contract Review",
    nameAr: "مراجعة العقد",
    steps: [
      {
        stepNumber: 1,
        approverRole: "Manager",
        label: "Manager Review",
        labelAr: "مراجعة المدير",
        dueDays: 3,
      },
      {
        stepNumber: 2,
        approverRole: "Legal",
        label: "Legal Review",
        labelAr: "المراجعة القانونية",
        dueDays: 3,
      },
    ],
  },
  {
    entityType: "payment",
    action: "approve_payment",
    name: "Payment Approval",
    nameAr: "الموافقة على الدفع",
    steps: [
      {
        stepNumber: 1,
        approverRole: "Finance",
        label: "Finance Review",
        labelAr: "مراجعة المالية",
        dueDays: 2,
      },
      {
        stepNumber: 2,
        approverRole: "Admin",
        label: "Admin Approval",
        labelAr: "موافقة المسؤول",
        dueDays: 2,
      },
    ],
  },
  {
    entityType: "offer",
    action: "review_offer",
    name: "Offer Review",
    nameAr: "مراجعة العرض",
    steps: [
      {
        stepNumber: 1,
        approverRole: "Manager",
        label: "Manager Review",
        labelAr: "مراجعة المدير",
        dueDays: 3,
      },
    ],
  },
  {
    entityType: "gate",
    action: "complete_gate",
    name: "Gate Completion",
    nameAr: "إكمال البوابة",
    steps: [
      {
        stepNumber: 1,
        approverRole: "Coach",
        label: "Coach Evaluation",
        labelAr: "تقييم المدرب",
        dueDays: 3,
      },
      {
        stepNumber: 2,
        approverRole: "Manager",
        label: "Manager Sign-off",
        labelAr: "موافقة المدير",
        dueDays: 3,
      },
    ],
  },
];

export async function seedApprovalChains(): Promise<void> {
  let created = 0;

  for (const tpl of TEMPLATES) {
    // Skip if active template already exists for this (entityType, action)
    const existing = await ApprovalChainTemplate.findOne({
      where: {
        entityType: tpl.entityType,
        action: tpl.action,
        isActive: true,
      },
    });

    if (existing) continue;

    const template = await ApprovalChainTemplate.create({
      entityType: tpl.entityType,
      action: tpl.action,
      name: tpl.name,
      nameAr: tpl.nameAr,
      isActive: true,
    });

    await ApprovalChainTemplateStep.bulkCreate(
      tpl.steps.map((s) => ({
        templateId: template.id,
        stepNumber: s.stepNumber,
        approverRole: s.approverRole,
        label: s.label,
        labelAr: s.labelAr,
        dueDays: s.dueDays,
        isMandatory: true,
      })),
    );

    created++;
  }

  if (created > 0) {
    logger.info(`✅ Seeded ${created} approval chain templates`);
  }
}
