/**
 * Offer Auto-Task Generator
 *
 * Real-time triggers:
 *  10. offer_new_review       — new offer created → Manager review
 *  11. offer_accepted_convert — status → Accepted → Legal/Manager to convert
 *
 * Cron triggers (in scheduler.ts):
 *   8. offer_deadline_approaching — deadline in 3 days
 *   9. offer_negotiation_stale   — Negotiation >14 days
 */

import { Op } from "sequelize";
import { Offer } from "@modules/offers/offer.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import {
  createAutoTaskIfNotExists,
  findUserByRole,
  cfg,
} from "@shared/utils/autoTaskHelpers";
import { logger } from "@config/logger";

// ── Helper: load offer context ──

async function loadOfferContext(offerId: string) {
  const offer = await Offer.findByPk(offerId, {
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
      { model: Club, as: "fromClub", attributes: ["id", "name", "nameAr"] },
      { model: Club, as: "toClub", attributes: ["id", "name", "nameAr"] },
    ],
  });
  if (!offer) return null;

  const player = (offer as any).player;
  const playerName = player
    ? `${player.firstName} ${player.lastName}`.trim()
    : "Unknown";
  const playerNameAr = player?.firstNameAr
    ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
    : playerName;

  return { offer, player, playerName, playerNameAr };
}

// ── 10. New offer → Manager review ──

export async function generateOfferCreationTask(
  offerId: string,
  createdBy: string,
) {
  const ctx = await loadOfferContext(offerId);
  if (!ctx) return;

  const manager = await findUserByRole("Manager");

  await createAutoTaskIfNotExists(
    {
      ruleId: "offer_new_review",
      title: `Review new ${ctx.offer.offerType} offer`,
      titleAr: `مراجعة عرض ${ctx.offer.offerType === "Transfer" ? "انتقال" : "إعارة"} جديد`,
      description: `New ${ctx.offer.offerType} offer for ${ctx.playerName} requires review. Transfer fee: ${ctx.offer.transferFee ?? "N/A"}, Salary: ${ctx.offer.salaryOffered ?? "N/A"}.`,
      descriptionAr: `عرض ${ctx.offer.offerType === "Transfer" ? "انتقال" : "إعارة"} جديد للاعب ${ctx.playerNameAr} يحتاج مراجعة.`,
      type: "Offer",
      priority: "high",
      assignedTo: manager?.id ?? null,
      assignedBy: createdBy,
      playerId: ctx.offer.playerId,
    },
    {
      roles: ["Manager", "Admin"],
      link: `/dashboard/offers/${offerId}`,
    },
  );
}

// ── 11. Offer accepted → Convert to contract ──

export async function generateOfferAcceptedTask(
  offerId: string,
  triggeredBy: string,
) {
  const ctx = await loadOfferContext(offerId);
  if (!ctx) return;

  const legal = await findUserByRole("Legal");
  const manager = await findUserByRole("Manager");

  await createAutoTaskIfNotExists(
    {
      ruleId: "offer_accepted_convert",
      title: "Convert accepted offer to contract",
      titleAr: "تحويل العرض المقبول إلى عقد",
      description: `Offer for ${ctx.playerName} has been accepted. Initiate contract creation and legal review. Offer type: ${ctx.offer.offerType}.`,
      descriptionAr: `تم قبول العرض للاعب ${ctx.playerNameAr}. بدء إنشاء العقد والمراجعة القانونية.`,
      type: "Offer",
      priority: "high",
      assignedTo: legal?.id ?? manager?.id ?? null,
      assignedBy: triggeredBy,
      playerId: ctx.offer.playerId,
    },
    {
      roles: ["Legal", "Manager"],
      link: `/dashboard/offers/${offerId}`,
    },
  );
}

// ── 8 & 9. Cron: deadline approaching + negotiation stale ──

export async function checkOfferDeadlines(): Promise<{
  deadlineApproaching: number;
  negotiationStale: number;
}> {
  let deadlineApproaching = 0;
  let negotiationStale = 0;

  // 8. Offers with deadline approaching
  const deadlineCfg = cfg("offer_deadline_approaching");
  if (deadlineCfg.enabled) {
    const thresholdDays = deadlineCfg.threshold ?? 3;
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + thresholdDays);

    const approachingOffers = await Offer.findAll({
      where: {
        deadline: { [Op.between]: [now, cutoff] },
        status: { [Op.notIn]: ["Accepted", "Rejected", "Closed", "Converted"] },
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

    for (const offer of approachingOffers) {
      const player = (offer as any).player;
      const playerName = player
        ? `${player.firstName} ${player.lastName}`.trim()
        : "Unknown";
      const playerNameAr = player?.firstNameAr
        ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
        : playerName;

      const manager = await findUserByRole("Manager");
      const task = await createAutoTaskIfNotExists(
        {
          ruleId: "offer_deadline_approaching",
          title: `Offer deadline approaching: ${playerName}`,
          titleAr: `اقتراب موعد العرض: ${playerNameAr}`,
          description: `Offer for ${playerName} has a deadline on ${offer.deadline}. Current status: ${offer.status}. Take action before the deadline passes.`,
          descriptionAr: `العرض للاعب ${playerNameAr} له موعد نهائي ${offer.deadline}. الحالة الحالية: ${offer.status}.`,
          type: "Offer",
          priority: "high",
          assignedTo: manager?.id ?? null,
          playerId: offer.playerId,
          dueDateStr: offer.deadline
            ? new Date(offer.deadline).toISOString().split("T")[0]
            : undefined,
        },
        {
          roles: ["Manager", "Admin"],
          link: `/dashboard/offers/${offer.id}`,
        },
      );
      if (task) deadlineApproaching++;
    }
  }

  // 9. Offers stuck in Negotiation
  const staleCfg = cfg("offer_negotiation_stale");
  if (staleCfg.enabled) {
    const staleDays = staleCfg.threshold ?? 14;
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    const staleOffers = await Offer.findAll({
      where: {
        status: "Negotiation",
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
          ],
        },
      ],
    });

    for (const offer of staleOffers) {
      const player = (offer as any).player;
      const playerName = player
        ? `${player.firstName} ${player.lastName}`.trim()
        : "Unknown";
      const playerNameAr = player?.firstNameAr
        ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
        : playerName;

      const manager = await findUserByRole("Manager");
      const task = await createAutoTaskIfNotExists(
        {
          ruleId: "offer_negotiation_stale",
          title: `Stale negotiation: ${playerName}`,
          titleAr: `تفاوض متوقف: ${playerNameAr}`,
          description: `Offer for ${playerName} has been in Negotiation for ${staleDays}+ days. Review and advance or close the offer.`,
          descriptionAr: `العرض للاعب ${playerNameAr} في حالة تفاوض لأكثر من ${staleDays} يوم. المراجعة والتقدم أو الإغلاق.`,
          type: "Offer",
          priority: "medium",
          assignedTo: manager?.id ?? null,
          playerId: offer.playerId,
        },
        {
          roles: ["Manager"],
          link: `/dashboard/offers/${offer.id}`,
        },
      );
      if (task) negotiationStale++;
    }
  }

  return { deadlineApproaching, negotiationStale };
}
