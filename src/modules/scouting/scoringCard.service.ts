import { ScoringCard } from "@modules/scouting/scoringCard.model";
import { Watchlist } from "@modules/scouting/scouting.model";
import { TransferWindow } from "@modules/transfer-windows/transferWindow.model";
import { AppError } from "@middleware/errorHandler";
import { buildMeta } from "@shared/utils/pagination";
import type {
  UpsertScoringCardInput,
  ScoringCardQuery,
} from "@modules/scouting/scoringCard.validation";

// ── Weighted total: each bucket 0–100, weights sum to 100 ──────────────────
function computeWeightedTotal(
  perf: number | null | undefined,
  contractFit: number | null | undefined,
  commercial: number | null | undefined,
  cultural: number | null | undefined,
  weights: {
    performance: number;
    contractFit: number;
    commercial: number;
    culturalFit: number;
  },
): number | null {
  if (
    perf == null &&
    contractFit == null &&
    commercial == null &&
    cultural == null
  )
    return null;

  const p = perf ?? 0;
  const cf = contractFit ?? 0;
  const co = commercial ?? 0;
  const cu = cultural ?? 0;

  return +(
    (p * weights.performance +
      cf * weights.contractFit +
      co * weights.commercial +
      cu * weights.culturalFit) /
    100
  ).toFixed(2);
}

// ── List ────────────────────────────────────────────────────────────────────
export async function listScoringCards(query: ScoringCardQuery) {
  const { page, limit, windowId, watchlistId, isShortlisted } = query;
  const where: Record<string, unknown> = {};
  if (windowId) where.windowId = windowId;
  if (watchlistId) where.watchlistId = watchlistId;
  if (isShortlisted !== undefined) where.isShortlisted = isShortlisted;

  const { rows, count } = await ScoringCard.findAndCountAll({
    where,
    include: [
      {
        model: Watchlist,
        as: "watchlist",
        attributes: [
          "id",
          "prospectName",
          "prospectNameAr",
          "position",
          "currentClub",
          "status",
          "priority",
        ],
      },
    ],
    limit,
    offset: (page - 1) * limit,
    order: [["weightedTotal", "DESC NULLS LAST"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ───────────────────────────────────────────────────────────────
export async function getScoringCardById(id: string) {
  const card = await ScoringCard.findByPk(id, {
    include: [
      { model: Watchlist, as: "watchlist" },
      { model: TransferWindow, as: "window" },
    ],
  });
  if (!card) throw new AppError("Scoring card not found", 404);
  return card;
}

// ── Upsert ──────────────────────────────────────────────────────────────────
export async function upsertScoringCard(
  data: UpsertScoringCardInput,
  userId: string,
) {
  const window = await TransferWindow.findByPk(data.windowId);
  if (!window) throw new AppError("Transfer window not found", 404);

  const watchlist = await Watchlist.findByPk(data.watchlistId);
  if (!watchlist) throw new AppError("Watchlist entry not found", 404);

  const weightedTotal = computeWeightedTotal(
    data.performanceScore,
    data.contractFitScore,
    data.commercialScore,
    data.culturalFitScore,
    window.weights,
  );

  const isShortlisted =
    weightedTotal !== null && weightedTotal >= window.shortlistThreshold;

  const payload = {
    watchlistId: data.watchlistId,
    windowId: data.windowId,
    performanceScore: data.performanceScore ?? null,
    contractFitScore: data.contractFitScore ?? null,
    commercialScore: data.commercialScore ?? null,
    culturalFitScore: data.culturalFitScore ?? null,
    criteriaScores: data.criteriaScores ?? null,
    notes: data.notes ?? null,
    weightedTotal,
    isShortlisted,
    scoredBy: userId,
    scoredAt: new Date(),
  };

  const existing = await ScoringCard.findOne({
    where: { watchlistId: data.watchlistId, windowId: data.windowId },
  });

  if (existing) return existing.update(payload);
  return ScoringCard.create(payload);
}

// ── Delete ──────────────────────────────────────────────────────────────────
export async function deleteScoringCard(id: string) {
  const card = await getScoringCardById(id);
  await card.destroy();
  return { id };
}
