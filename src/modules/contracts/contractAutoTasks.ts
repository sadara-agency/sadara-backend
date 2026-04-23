/**
 * Contract Auto-Task Generator
 *
 * Creates automated tasks when contracts are created or transition status:
 *  1. contract_legal_review     — on creation → Legal review
 *  2. contract_submit_review    — status → Review → Legal review
 *  3. contract_get_signatures   — status → Signing → Manager to collect signatures
 *  4. contract_player_followup  — status → AwaitingPlayer → Agent to follow up
 */

import { Contract } from "@modules/contracts/contract.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import {
  createAutoTaskIfNotExists,
  findUserByRole,
} from "@shared/utils/autoTaskHelpers";
import { logger } from "@config/logger";

const CONTRACT_TYPE_AR: Record<string, string> = {
  Representation: "تمثيل",
  CareerManagement: "إدارة مسيرة",
  Transfer: "انتقال",
  Loan: "إعارة",
  Renewal: "تجديد",
  Sponsorship: "رعاية",
  ImageRights: "حقوق صورة",
  MedicalAuth: "تفويض طبي",
  Termination: "إنهاء",
};

// ── Helper: load contract with context ──

async function loadContractContext(contractId: string) {
  const contract = await Contract.findByPk(contractId, {
    include: [
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
        ],
      },
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr"],
      },
    ],
  });
  if (!contract) return null;

  const player = (contract as any).player;
  const club = (contract as any).club;
  const playerName = player
    ? `${player.firstName} ${player.lastName}`.trim()
    : "Unknown Player";
  const playerNameAr = player?.firstNameAr
    ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
    : playerName;
  const clubName = club?.name ?? "Unknown Club";
  const clubNameAr = club?.nameAr ?? clubName;

  // Fall back to the contract type when the title is blank so auto-task
  // messages never read 'Contract "null" …' / 'العقد "null" …'.
  const contractTypeLabel =
    CONTRACT_TYPE_AR[contract.contractType] ?? contract.contractType;
  const contractLabel = contract.title?.trim() || contract.contractType;
  const contractLabelAr = contract.title?.trim() || contractTypeLabel;

  return {
    contract,
    player,
    club,
    playerName,
    playerNameAr,
    clubName,
    clubNameAr,
    contractLabel,
    contractLabelAr,
  };
}

// ── 1. Contract creation → Legal review ──

export async function generateContractCreationTask(
  contractId: string,
  createdBy: string,
) {
  const ctx = await loadContractContext(contractId);
  if (!ctx) return;

  const legalUser = await findUserByRole("Legal");

  await createAutoTaskIfNotExists(
    {
      ruleId: "contract_legal_review",
      title: "Review new contract",
      titleAr: "مراجعة العقد الجديد",
      description: `New contract "${ctx.contractLabel}" for ${ctx.playerName} with ${ctx.clubName} requires legal review. Verify terms, compliance, and completeness.`,
      descriptionAr: `عقد جديد "${ctx.contractLabelAr}" للاعب ${ctx.playerNameAr} مع ${ctx.clubNameAr} يحتاج مراجعة قانونية. التحقق من الشروط والامتثال والاكتمال.`,
      type: "Contract",
      priority: "high",
      assignedTo: legalUser?.id ?? null,
      assignedBy: createdBy,
      playerId: ctx.contract.playerId,
      contractId,
    },
    {
      roles: ["Legal"],
      link: `/dashboard/contracts/${contractId}`,
    },
  );

  if (!legalUser) {
    logger.warn(
      "No active Legal user found for contract auto-task assignment",
      {
        contractId,
      },
    );
  }
}

// ── 2. Contract transition tasks ──

export async function generateContractTransitionTask(
  contractId: string,
  newStatus: string,
  triggeredBy: string,
) {
  const ctx = await loadContractContext(contractId);
  if (!ctx) return;

  if (newStatus === "Review") {
    const legalUser = await findUserByRole("Legal");
    await createAutoTaskIfNotExists(
      {
        ruleId: "contract_submit_review",
        title: "Review contract submission",
        titleAr: "مراجعة تقديم العقد",
        description: `Contract "${ctx.contractLabel}" for ${ctx.playerName} has been submitted for review. Complete legal and compliance review.`,
        descriptionAr: `تم تقديم العقد "${ctx.contractLabelAr}" للاعب ${ctx.playerNameAr} للمراجعة. إكمال المراجعة القانونية والامتثال.`,
        type: "Contract",
        priority: "high",
        assignedTo: legalUser?.id ?? null,
        assignedBy: triggeredBy,
        playerId: ctx.contract.playerId,
        contractId,
      },
      {
        roles: ["Legal"],
        link: `/dashboard/contracts/${contractId}`,
      },
    );
  }

  if (newStatus === "Signing") {
    const manager = await findUserByRole("Manager");
    await createAutoTaskIfNotExists(
      {
        ruleId: "contract_get_signatures",
        title: "Collect contract signatures",
        titleAr: "جمع توقيعات العقد",
        description: `Contract "${ctx.contractLabel}" for ${ctx.playerName} is approved and ready for signing. Coordinate agent and player signatures.`,
        descriptionAr: `العقد "${ctx.contractLabelAr}" للاعب ${ctx.playerNameAr} تمت الموافقة عليه وجاهز للتوقيع. تنسيق توقيعات الوكيل واللاعب.`,
        type: "Contract",
        priority: "high",
        assignedTo: manager?.id ?? null,
        assignedBy: triggeredBy,
        playerId: ctx.contract.playerId,
        contractId,
      },
      {
        roles: ["Manager"],
        link: `/dashboard/contracts/${contractId}`,
      },
    );
  }

  if (newStatus === "AwaitingPlayer") {
    // Assign to the player's agent if available, otherwise any Manager
    const agentId = ctx.player?.agentId ?? null;
    const assignee = agentId || (await findUserByRole("Manager"))?.id || null;

    await createAutoTaskIfNotExists(
      {
        ruleId: "contract_player_followup",
        title: "Follow up on player signature",
        titleAr: "متابعة توقيع اللاعب",
        description: `Contract "${ctx.contractLabel}" for ${ctx.playerName} is awaiting player signature. Follow up to ensure timely completion.`,
        descriptionAr: `العقد "${ctx.contractLabelAr}" للاعب ${ctx.playerNameAr} في انتظار توقيع اللاعب. المتابعة لضمان الإنجاز في الوقت المناسب.`,
        type: "Contract",
        priority: "medium",
        assignedTo: assignee,
        assignedBy: triggeredBy,
        playerId: ctx.contract.playerId,
        contractId,
      },
      {
        roles: ["Manager"],
        userIds: agentId ? [agentId] : undefined,
        link: `/dashboard/contracts/${contractId}`,
      },
    );
  }
}
