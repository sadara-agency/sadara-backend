/**
 * Aggregates a player's decision-relevant facts from existing module services
 * into one `ExecutiveReportData`. READ-ONLY — no writes, no new tables.
 *
 * Derived facts (monthsRemaining, valuation changePct, ratingTrendPct,
 * biggestImprovement) are computed here. Where a baseline is missing the field is
 * left `null` so the narrative engine omits — never fabricates — that sentence.
 */
import { Op } from "sequelize";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { Contract } from "@modules/contracts/contract.model";
import { TechnicalReport } from "@modules/reports/report.model";
import { Offer } from "@modules/offers/offer.model";
import { Valuation } from "@modules/finance/finance.model";
import { AppError } from "@middleware/errorHandler";
import { getAllPlayerSeasonStats } from "@modules/playerStats/playerStats.service";
import type {
  ExecutiveReportData,
  BiggestImprovement,
} from "@modules/executive-report/executive-report.types";

/** Offer statuses that count as live market interest for the brief. */
const ACTIVE_OFFER_STATUSES = [
  "New",
  "Under Review",
  "Negotiation",
  "Accepted",
];

/**
 * Season-stat fields eligible for the "biggest improvement" comparison.
 * Counting/rate metrics where higher is unambiguously better.
 */
const IMPROVEMENT_FIELDS = [
  "goals",
  "assists",
  "keyPasses",
  "chancesCreated",
  "shotsOnTarget",
  "interceptions",
  "tacklesMade",
  "passingAccuracy",
  "savesMade",
] as const;

function round(n: number): number {
  return Math.round(n);
}

/** Whole months from today until an ISO date (negative if past). */
function monthsUntil(isoDate: string): number {
  const end = new Date(isoDate);
  const now = new Date();
  const months =
    (end.getFullYear() - now.getFullYear()) * 12 +
    (end.getMonth() - now.getMonth());
  // pull back one month if the day-of-month hasn't been reached yet
  return end.getDate() < now.getDate() ? months - 1 : months;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Highest positive %-delta metric between current and prior season rows. */
function computeBiggestImprovement(
  current: Record<string, unknown>,
  prior: Record<string, unknown>,
): BiggestImprovement | null {
  let best: BiggestImprovement | null = null;
  for (const field of IMPROVEMENT_FIELDS) {
    const cur = num(current[field]);
    const prev = num(prior[field]);
    if (cur === null || prev === null || prev <= 0) continue;
    const deltaPct = round(((cur - prev) / prev) * 100);
    if (deltaPct <= 0) continue;
    if (!best || deltaPct > best.deltaPct) {
      best = { metric: field, deltaPct };
    }
  }
  return best;
}

export async function aggregateExecutiveReportData(
  playerId: string,
): Promise<ExecutiveReportData> {
  const player = await Player.findByPk(playerId, {
    include: [
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr"],
        required: false,
      },
    ],
  });
  if (!player) throw new AppError("Player not found", 404);

  const club = (player as unknown as { club?: Club | null }).club;

  // ── Season stats: latest row + prior row (DESC by season) ──
  const seasonRows = await getAllPlayerSeasonStats(playerId);
  const currentSeason = seasonRows[0] ?? null;
  const priorSeason = seasonRows[1] ?? null;
  const currentJson = currentSeason
    ? (currentSeason.toJSON() as unknown as Record<string, unknown>)
    : null;
  const priorJson = priorSeason
    ? (priorSeason.toJSON() as unknown as Record<string, unknown>)
    : null;

  // ── Technical rating: latest two reports with an overallScore ──
  const ratedReports = await TechnicalReport.findAll({
    where: { playerId, overallScore: { [Op.ne]: null } },
    order: [["createdAt", "DESC"]],
    limit: 2,
    attributes: ["overallScore", "createdAt"],
  });
  const latestRating = ratedReports[0]
    ? num(ratedReports[0].overallScore)
    : null;
  const priorRating = ratedReports[1]
    ? num(ratedReports[1].overallScore)
    : null;
  const ratingTrendPct =
    latestRating !== null && priorRating !== null && priorRating > 0
      ? round(((latestRating - priorRating) / priorRating) * 100)
      : null;

  // ── Active contract: end date + months remaining ──
  const contract = await Contract.findOne({
    where: {
      playerId,
      status: { [Op.in]: ["Active", "Expiring Soon"] },
    },
    order: [["endDate", "DESC"]],
    attributes: ["endDate", "salaryCurrency"],
  });
  const endDate = contract?.endDate ?? null;

  // ── Offers: active market interest + interested club names ──
  const activeOffers = await Offer.findAll({
    where: { playerId, status: { [Op.in]: ACTIVE_OFFER_STATUSES } },
    include: [
      {
        model: Club,
        as: "fromClub",
        attributes: ["id", "name", "nameAr"],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
  });
  const interestedClubsEn: string[] = [];
  const interestedClubsAr: string[] = [];
  for (const o of activeOffers) {
    const from = (
      o as unknown as { fromClub?: { name?: string; nameAr?: string } }
    ).fromClub;
    if (from?.name && !interestedClubsEn.includes(from.name)) {
      interestedClubsEn.push(from.name);
      interestedClubsAr.push(from.nameAr ?? from.name);
    }
  }

  // ── Valuation trend: current vs earliest valuation on record ──
  const valuationRows = await Valuation.findAll({
    where: { playerId },
    order: [["valuedAt", "ASC"]],
    attributes: ["value", "valuedAt"],
  });
  let changePct: number | null = null;
  let direction: "up" | "down" | "stable" | null = null;
  if (valuationRows.length >= 2) {
    const first = num(valuationRows[0].value);
    const last = num(valuationRows[valuationRows.length - 1].value);
    if (first !== null && last !== null && first > 0) {
      changePct = round(((last - first) / first) * 100);
      direction = changePct > 0 ? "up" : changePct < 0 ? "down" : "stable";
    }
  }

  const biggestImprovement =
    currentJson && priorJson
      ? computeBiggestImprovement(currentJson, priorJson)
      : null;

  return {
    player: {
      id: player.id,
      nameEn: player.fullName,
      nameAr: player.fullNameAr,
      age: player.age,
      position: player.position ?? null,
      clubNameEn: club?.name ?? null,
      clubNameAr: club?.nameAr ?? club?.name ?? null,
      marketValue: num(player.marketValue),
      marketValueCurrency: player.marketValueCurrency,
      injuredFlag: player.status === "injured",
    },
    season: {
      label: currentSeason?.season ?? null,
      matchesPlayed: currentJson ? num(currentJson.matchesPlayed) : null,
      goals: currentJson ? num(currentJson.goals) : null,
      assists: currentJson ? num(currentJson.assists) : null,
      minutesPlayed: currentJson ? num(currentJson.minutesPlayed) : null,
      rating: latestRating,
      ratingTrendPct,
      ratingDeclining: ratingTrendPct !== null && ratingTrendPct < 0,
      biggestImprovement,
    },
    contract: {
      endDate,
      monthsRemaining: endDate ? monthsUntil(endDate) : null,
      salaryCurrency: contract?.salaryCurrency ?? null,
    },
    offers: {
      activeCount: activeOffers.length,
      interestedClubsEn,
      interestedClubsAr,
    },
    valuation: {
      changePct,
      direction,
    },
  };
}
