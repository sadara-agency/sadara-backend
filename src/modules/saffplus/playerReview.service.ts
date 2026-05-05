// ─────────────────────────────────────────────────────────────
// src/modules/saffplus/playerReview.service.ts
//
// CRUD for the unmatched-roster review queue. Three resolution
// outcomes:
//
//   1. linkReviewToPlayer — admin maps the scraped name to an
//      existing Sadara player. Side-effect: writes the corresponding
//      squad_membership row + stamps the player's external_ids with
//      the SAFF+ id (so future re-scrapes match instantly).
//   2. rejectReview — admin marks "not relevant" (e.g., scraped
//      garbage, opposition team listed by mistake).
//   3. markDuplicate — admin says "this is the same person as
//      another review row that's already linked".
//
// Phase 2 implements the service; routes/controller live in the
// existing saffplus module files (saffplus.routes.ts, saffplus.controller.ts).
// ─────────────────────────────────────────────────────────────
import { fn, col } from "sequelize";
import { logger } from "@config/logger";
import { AppError } from "@middleware/errorHandler";
import { buildMeta } from "@shared/utils/pagination";
import { Player } from "@modules/players/player.model";
import { SquadMembership } from "@modules/squads/squadMembership.model";
import {
  PlayerMatchReview,
  type PlayerReviewSuggestion,
} from "./playerReview.model";
import type { PlayerReviewQuery } from "./playerReview.validation";

// ── List ──

export async function listReview(query: PlayerReviewQuery) {
  const { status, squadId, season, page, limit } = query;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (squadId) where.squadId = squadId;
  if (season) where.season = season;

  const { rows, count } = await PlayerMatchReview.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Detail ──

export async function getReviewById(id: string) {
  const row = await PlayerMatchReview.findByPk(id);
  if (!row) throw new AppError("Review row not found", 404);
  return row;
}

// ── Resolution: link ──

/**
 * Link an unmatched scraped roster entry to an existing Sadara player.
 *
 * Side effects:
 *  • Stamps `players.external_ids.saffplus = externalPlayerId` (when present)
 *    so future scrapes match instantly via Layer-1 lookup.
 *  • Inserts a `squad_memberships` row for (squadId, playerId, season) if
 *    the review row carries a squad context.
 *  • Marks the review row `status='linked'` with reviewer + timestamp.
 */
export async function linkReviewToPlayer(
  id: string,
  playerId: string,
  reviewedBy: string,
): Promise<PlayerMatchReview> {
  const row = await PlayerMatchReview.findByPk(id);
  if (!row) throw new AppError("Review row not found", 404);
  if (row.status !== "pending") {
    throw new AppError(`Review row already ${row.status}; cannot relink`, 409);
  }

  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError("Player not found", 404);

  // 1) Stamp the SAFF+ external id on the player
  if (row.externalPlayerId) {
    const existing = (player.externalIds ?? {}) as Record<string, string>;
    if (existing[row.providerSource] !== row.externalPlayerId) {
      player.externalIds = {
        ...existing,
        [row.providerSource]: row.externalPlayerId,
      };
      await player.save();

      // Auto-enrich with full SAFF+ profile now that we have the external id.
      // Lazy require breaks the circular dependency (playerReview ↔ saffplus.service).
      if (row.providerSource === "saffplus") {
        const { autoEnrichPlayerFromSaffPlus } =
          require("./saffplus.service") as typeof import("./saffplus.service");
        autoEnrichPlayerFromSaffPlus(player.id, row.externalPlayerId).catch(
          (err) =>
            logger.warn(
              `[SAFF+ review] autoEnrich failed (${player.id}): ${(err as Error).message}`,
            ),
        );
      }
    }
  }

  // 2) Write the squad_membership row if we have a squad context
  if (row.squadId) {
    await SquadMembership.findOrCreate({
      where: {
        squadId: row.squadId,
        playerId: player.id,
        season: row.season,
      },
      defaults: {
        squadId: row.squadId,
        playerId: player.id,
        season: row.season,
        jerseyNumber: row.scrapedJerseyNumber,
        position: row.scrapedPosition,
        externalMembershipId: row.externalPlayerId,
        providerSource: row.providerSource,
        joinedAt: null,
        leftAt: null,
      },
    });
  }

  // 3) Mark the review row resolved
  await row.update({
    status: "linked",
    linkedPlayerId: player.id,
    reviewedBy,
    reviewedAt: new Date(),
  });

  logger.info(
    `[SAFF+ review] Linked review ${id} → player ${player.id} (squad=${row.squadId ?? "n/a"}, season=${row.season})`,
  );
  return row;
}

// ── Resolution: reject ──

export async function rejectReview(
  id: string,
  reviewedBy: string,
  reason?: string,
): Promise<PlayerMatchReview> {
  const row = await PlayerMatchReview.findByPk(id);
  if (!row) throw new AppError("Review row not found", 404);
  if (row.status !== "pending") {
    throw new AppError(`Review row already ${row.status}; cannot reject`, 409);
  }

  const rawPayload = (row.rawPayload ?? {}) as Record<string, unknown>;
  await row.update({
    status: "rejected",
    reviewedBy,
    reviewedAt: new Date(),
    rawPayload: reason
      ? { ...rawPayload, rejectReason: reason }
      : row.rawPayload,
  });

  logger.info(
    `[SAFF+ review] Rejected review ${id} (reason: ${reason ?? "—"})`,
  );
  return row;
}

// ── Resolution: duplicate ──

export async function markDuplicate(
  id: string,
  reviewedBy: string,
): Promise<PlayerMatchReview> {
  const row = await PlayerMatchReview.findByPk(id);
  if (!row) throw new AppError("Review row not found", 404);
  if (row.status !== "pending") {
    throw new AppError(
      `Review row already ${row.status}; cannot mark duplicate`,
      409,
    );
  }

  await row.update({
    status: "duplicate",
    reviewedBy,
    reviewedAt: new Date(),
  });

  return row;
}

// ── Internal helper used by the roster sync ──

/**
 * Idempotent upsert used by the SAFF+ roster scraper. Called once per
 * unmatched scraped player. Honors the unique partial index
 * (provider_source, external_player_id, squad_id, season) so re-scrapes
 * don't create duplicate review rows.
 */
export async function upsertPendingReview(input: {
  scrapedNameAr?: string | null;
  scrapedNameEn?: string | null;
  scrapedDob?: string | null;
  scrapedNationality?: string | null;
  scrapedJerseyNumber?: number | null;
  scrapedPosition?: string | null;
  squadId: string | null;
  season: string;
  suggestedPlayerIds: PlayerReviewSuggestion[];
  externalPlayerId?: string | null;
  providerSource?: string;
  rawPayload?: Record<string, unknown> | null;
}): Promise<PlayerMatchReview> {
  const provider = input.providerSource ?? "saffplus";

  // If we have a stable external id, look up first to avoid duplicates.
  if (input.externalPlayerId && input.squadId) {
    const existing = await PlayerMatchReview.findOne({
      where: {
        providerSource: provider,
        externalPlayerId: input.externalPlayerId,
        squadId: input.squadId,
        season: input.season,
      },
    });
    if (existing) {
      // Refresh suggestions (matcher results may have improved over time)
      // but only when the row is still pending.
      if (existing.status === "pending") {
        await existing.update({
          suggestedPlayerIds: input.suggestedPlayerIds,
          scrapedNameAr: input.scrapedNameAr ?? existing.scrapedNameAr,
          scrapedNameEn: input.scrapedNameEn ?? existing.scrapedNameEn,
          scrapedDob: input.scrapedDob ?? existing.scrapedDob,
          scrapedNationality:
            input.scrapedNationality ?? existing.scrapedNationality,
          scrapedJerseyNumber:
            input.scrapedJerseyNumber ?? existing.scrapedJerseyNumber,
          scrapedPosition: input.scrapedPosition ?? existing.scrapedPosition,
          rawPayload: input.rawPayload ?? existing.rawPayload,
        });
      }
      return existing;
    }
  }

  return PlayerMatchReview.create({
    scrapedNameAr: input.scrapedNameAr ?? null,
    scrapedNameEn: input.scrapedNameEn ?? null,
    scrapedDob: input.scrapedDob ?? null,
    scrapedNationality: input.scrapedNationality ?? null,
    scrapedJerseyNumber: input.scrapedJerseyNumber ?? null,
    scrapedPosition: input.scrapedPosition ?? null,
    squadId: input.squadId,
    season: input.season,
    suggestedPlayerIds: input.suggestedPlayerIds,
    status: "pending",
    linkedPlayerId: null,
    reviewedBy: null,
    reviewedAt: null,
    externalPlayerId: input.externalPlayerId ?? null,
    providerSource: provider,
    rawPayload: input.rawPayload ?? null,
  });
}

// ── KPI summary used by the dashboard ──

export async function getReviewSummary(): Promise<{
  pending: number;
  linked: number;
  rejected: number;
  duplicate: number;
  total: number;
}> {
  const counts = await PlayerMatchReview.findAll({
    attributes: ["status", [fn("COUNT", col("id")), "count"]],
    group: ["status"],
    raw: true,
  });

  const summary = {
    pending: 0,
    linked: 0,
    rejected: 0,
    duplicate: 0,
    total: 0,
  };
  for (const row of counts as unknown as Array<{
    status: string;
    count: string;
  }>) {
    const n = Number(row.count);
    if (row.status in summary) {
      (summary as Record<string, number>)[row.status] = n;
    }
    summary.total += n;
  }
  return summary;
}
