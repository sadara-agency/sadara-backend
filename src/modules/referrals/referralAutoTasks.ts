/**
 * Referral Auto-Task Generator
 *
 * Real-time trigger:
 *  25. referral_critical_created — new Critical referral → Manager
 *
 * Cron trigger (registered in scheduler.ts):
 *  26. referral_overdue — Open/InProgress past dueDate
 */

import { Op } from "sequelize";
import { Referral } from "@modules/referrals/referral.model";
import { Player } from "@modules/players/player.model";
import {
  createAutoTaskIfNotExists,
  findUserByRole,
  cfg,
} from "@shared/utils/autoTaskHelpers";
import { logger } from "@config/logger";

// ── 25. Critical referral → Manager task ──

export async function generateCriticalReferralTask(
  referralId: string,
  createdBy: string,
) {
  const referral = await Referral.findByPk(referralId, {
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
    ],
  });
  if (!referral) return;
  if (referral.priority !== "Critical") return;

  const player = (referral as any).player;
  const playerName = player
    ? `${player.firstName} ${player.lastName}`.trim()
    : "Unknown";
  const playerNameAr = player?.firstNameAr
    ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
    : playerName;

  const manager = await findUserByRole("Manager");

  await createAutoTaskIfNotExists(
    {
      ruleId: "referral_critical_created",
      title: `Critical referral: ${playerName}`,
      titleAr: `إحالة حرجة: ${playerNameAr}`,
      description: `A critical ${referral.referralType} referral has been created for ${playerName}. Immediate attention required. ${referral.triggerDesc || ""}`,
      descriptionAr: `تم إنشاء إحالة ${referral.referralType} حرجة للاعب ${playerNameAr}. مطلوب اهتمام فوري.`,
      type: "Health",
      priority: "critical",
      assignedTo: referral.assignedTo ?? manager?.id ?? null,
      assignedBy: createdBy,
      playerId: referral.playerId,
      referralId,
    },
    {
      roles: ["Manager", "Admin"],
      userIds: referral.assignedTo ? [referral.assignedTo] : undefined,
      link: `/dashboard/referrals/${referralId}`,
    },
  );
}

// ── 26. Cron: overdue referrals ──

export async function checkReferralOverdue(): Promise<{ created: number }> {
  const rc = cfg("referral_overdue");
  if (!rc.enabled) return { created: 0 };

  const today = new Date().toISOString().split("T")[0];

  const overdue = await Referral.findAll({
    where: {
      status: { [Op.in]: ["Open", "InProgress", "Waiting"] },
      dueDate: { [Op.lt]: today },
    },
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
    ],
  });

  let created = 0;
  for (const ref of overdue) {
    const player = (ref as any).player;
    const playerName = player
      ? `${player.firstName} ${player.lastName}`.trim()
      : "Unknown";
    const playerNameAr = player?.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
      : playerName;

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "referral_overdue",
        title: `Overdue referral: ${playerName}`,
        titleAr: `إحالة متأخرة: ${playerNameAr}`,
        description: `${ref.referralType} referral for ${playerName} is past due (${ref.dueDate}). Status: ${ref.status}. Take action or escalate.`,
        descriptionAr: `إحالة ${ref.referralType} للاعب ${playerNameAr} تجاوزت الموعد (${ref.dueDate}).`,
        type: "Health",
        priority: "high",
        assignedTo: ref.assignedTo ?? null,
        playerId: ref.playerId,
        referralId: ref.id,
      },
      {
        roles: ["Manager"],
        link: `/dashboard/referrals/${ref.id}`,
      },
    );
    if (task) created++;
  }

  return { created };
}
