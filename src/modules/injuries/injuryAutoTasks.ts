/**
 * Injury Auto-Task Generator
 *
 * Real-time trigger:
 *  12. injury_new_critical — new Critical/Severe injury → Coach + Manager
 *
 * Cron triggers (added to injury.engine.ts):
 *  13. injury_return_overdue    — expectedReturnDate passed, still UnderTreatment
 *  14. injury_treatment_stale   — no InjuryUpdate in 14 days
 */

import { Op } from "sequelize";
import { Injury, InjuryUpdate } from "@modules/injuries/injury.model";
import { Player } from "@modules/players/player.model";
import {
  createAutoTaskIfNotExists,
  findUserByRole,
  cfg,
  dueDate,
} from "@shared/utils/autoTaskHelpers";
import { logger } from "@config/logger";

// ── 12. New critical/severe injury → immediate task ──

export async function generateCriticalInjuryTask(
  injuryId: string,
  createdBy: string,
) {
  const injury = await Injury.findByPk(injuryId, {
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
          "coachId",
          "agentId",
        ],
      },
    ],
  });
  if (!injury) return;

  // Only fire for Critical or Severe
  if (injury.severity !== "Critical" && injury.severity !== "Severe") return;

  const player = (injury as any).player;
  const playerName = player
    ? `${player.firstName} ${player.lastName}`.trim()
    : "Unknown";
  const playerNameAr = player?.firstNameAr
    ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
    : playerName;

  // Assign to player's coach, fallback to any Coach or Manager
  const assignee =
    player?.coachId ??
    (await findUserByRole("Coach"))?.id ??
    (await findUserByRole("Manager"))?.id ??
    null;

  await createAutoTaskIfNotExists(
    {
      ruleId: "injury_new_critical",
      title: `Urgent: ${injury.severity} injury — ${playerName}`,
      titleAr: `عاجل: إصابة ${injury.severity === "Critical" ? "خطيرة" : "حادة"} — ${playerNameAr}`,
      description: `${playerName} has a ${injury.severity.toLowerCase()} ${injury.injuryType} injury (${injury.bodyPart}). Immediate assessment and action plan required. Diagnosis: ${injury.diagnosis || "Pending"}.`,
      descriptionAr: `${playerNameAr} لديه إصابة ${injury.injuryTypeAr || injury.injuryType} ${injury.severity === "Critical" ? "خطيرة" : "حادة"} (${injury.bodyPartAr || injury.bodyPart}). مطلوب تقييم فوري وخطة عمل.`,
      type: "Health",
      priority: "critical",
      assignedTo: assignee,
      assignedBy: createdBy,
      playerId: injury.playerId,
    },
    {
      roles: ["Coach", "Manager"],
      userIds: player?.coachId ? [player.coachId] : undefined,
      link: "/dashboard/injuries",
    },
  );
}

// ── 13. Cron: injury return overdue ──

export async function checkInjuryReturnOverdue(): Promise<{ created: number }> {
  const rc = cfg("injury_return_overdue");
  if (!rc.enabled) return { created: 0 };

  const today = new Date().toISOString().split("T")[0];

  const overdueInjuries = await Injury.findAll({
    where: {
      status: "UnderTreatment",
      expectedReturnDate: { [Op.lt]: today },
      actualReturnDate: null,
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
          "coachId",
        ],
      },
    ],
  });

  let created = 0;
  for (const injury of overdueInjuries) {
    const player = (injury as any).player;
    const playerName = player
      ? `${player.firstName} ${player.lastName}`.trim()
      : "Unknown";
    const playerNameAr = player?.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
      : playerName;

    const assignee =
      player?.coachId ?? (await findUserByRole("Coach"))?.id ?? null;

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "injury_return_overdue",
        title: `Overdue return: ${playerName}`,
        titleAr: `تأخر العودة: ${playerNameAr}`,
        description: `${playerName}'s expected return date (${injury.expectedReturnDate}) has passed but they are still under treatment. Review recovery status and update timeline.`,
        descriptionAr: `تجاوز تاريخ العودة المتوقع (${injury.expectedReturnDate}) للاعب ${playerNameAr} ولا يزال تحت العلاج. مراجعة حالة التعافي وتحديث الجدول الزمني.`,
        type: "Health",
        priority: "high",
        assignedTo: assignee,
        playerId: injury.playerId,
      },
      {
        roles: ["Coach", "Manager"],
        link: "/dashboard/injuries",
      },
    );
    if (task) created++;
  }

  return { created };
}

// ── 14. Cron: injury treatment stale ──

export async function checkInjuryTreatmentStale(): Promise<{
  created: number;
}> {
  const rc = cfg("injury_treatment_stale");
  if (!rc.enabled) return { created: 0 };

  const staleDays = rc.threshold ?? 14;
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleDays);

  // Find active injuries with no recent updates
  const activeInjuries = await Injury.findAll({
    where: {
      status: "UnderTreatment",
      updatedAt: { [Op.lte]: staleDate },
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
          "coachId",
        ],
      },
    ],
  });

  let created = 0;
  for (const injury of activeInjuries) {
    // Check if there's a recent InjuryUpdate
    const recentUpdate = await InjuryUpdate.findOne({
      where: {
        injuryId: injury.id,
        createdAt: { [Op.gte]: staleDate },
      },
    });
    if (recentUpdate) continue;

    const player = (injury as any).player;
    const playerName = player
      ? `${player.firstName} ${player.lastName}`.trim()
      : "Unknown";
    const playerNameAr = player?.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
      : playerName;

    const assignee =
      player?.coachId ?? (await findUserByRole("Coach"))?.id ?? null;

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "injury_treatment_stale",
        title: `No injury update: ${playerName}`,
        titleAr: `لا تحديث للإصابة: ${playerNameAr}`,
        description: `${playerName}'s ${injury.injuryType} injury has had no updates for ${staleDays}+ days. Add a progress update or change the injury status.`,
        descriptionAr: `إصابة ${playerNameAr} (${injury.injuryTypeAr || injury.injuryType}) لم يتم تحديثها لأكثر من ${staleDays} يوم.`,
        type: "Health",
        priority: "medium",
        assignedTo: assignee,
        playerId: injury.playerId,
      },
      {
        roles: ["Coach"],
        link: "/dashboard/injuries",
      },
    );
    if (task) created++;
  }

  return { created };
}
