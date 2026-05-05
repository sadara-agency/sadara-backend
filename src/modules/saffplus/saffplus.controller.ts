import { Response } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { AuthRequest } from "@shared/types";
import * as saffPlusService from "./saffplus.service";
import * as playerReviewService from "./playerReview.service";
import { getCurrentSeason } from "@modules/saff/saff.service";

// ── Discovery ──

export async function discover(req: AuthRequest, res: Response) {
  const result = await saffPlusService.discover();
  sendSuccess(
    res,
    result,
    `Platform: ${result.platform}, pages: ${result.navPages.join(", ")}`,
  );
}

// ── Competitions ──

export async function listCompetitions(_req: AuthRequest, res: Response) {
  const result = await saffPlusService.getCompetitions();
  sendSuccess(res, result);
}

// ── Teams / Clubs ──

export async function listTeams(_req: AuthRequest, res: Response) {
  const result = await saffPlusService.getTeams();
  sendSuccess(res, result);
}

// ── Standings ──

export async function listStandings(req: AuthRequest, res: Response) {
  const { competitionId } = req.params;
  const season = (req.query.season as string) || undefined;
  const result = await saffPlusService.getStandings(competitionId, season);
  sendSuccess(res, result);
}

// ── Matches ──

export async function listMatches(req: AuthRequest, res: Response) {
  const { competitionId } = req.params;
  const season = (req.query.season as string) || undefined;
  const result = await saffPlusService.getMatches(competitionId, season);
  sendSuccess(res, result);
}

// ── Sync (API-first with scraper fallback) ──

export async function syncLeagues(req: AuthRequest, res: Response) {
  const season = req.body.season || getCurrentSeason();
  const saffIds = req.body.saffIds || undefined; // defaults to 5 men's leagues
  const result = saffIds
    ? await saffPlusService.syncLeagues(saffIds, season)
    : await saffPlusService.syncMenLeagues(season);

  await logAudit(
    "CREATE",
    "saff_tournaments",
    null,
    buildAuditContext(req.user!, req.ip),
    `SAFF+ sync (${result.source}): ${season}`,
  );
  sendSuccess(res, result, `Synced via ${result.source}`);
}

// ── Phase 2: Club squads + rosters sync ──

export async function syncClubSquads(req: AuthRequest, res: Response) {
  const { clubId } = req.params;
  const { clubSlug, season } = req.body as {
    clubSlug: string;
    season?: string;
  };
  const result = await saffPlusService.syncClubSquadsAndRosters(
    clubId,
    clubSlug,
    season || getCurrentSeason(),
  );

  await logAudit(
    "CREATE",
    "squad_memberships",
    clubId,
    buildAuditContext(req.user!, req.ip),
    `SAFF+ squad/roster sync for club ${clubId} (${clubSlug})`,
  );
  sendSuccess(
    res,
    result,
    `Squads: ${result.squadsCreated} new / ${result.squadsExisting} existing; ` +
      `${result.membershipsUpserted} memberships, ${result.reviewQueued} queued`,
  );
}

// ── Phase 2: Player review queue ──

export async function listPlayerReview(req: AuthRequest, res: Response) {
  const result = await playerReviewService.listReview(req.query as never);
  sendSuccess(res, result);
}

export async function getPlayerReviewSummary(_req: AuthRequest, res: Response) {
  const summary = await playerReviewService.getReviewSummary();
  sendSuccess(res, summary);
}

export async function getPlayerReviewById(req: AuthRequest, res: Response) {
  const row = await playerReviewService.getReviewById(req.params.id);
  sendSuccess(res, row);
}

export async function linkPlayerReview(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { playerId } = req.body as { playerId: string };
  const row = await playerReviewService.linkReviewToPlayer(
    id,
    playerId,
    req.user!.id,
  );
  await logAudit(
    "UPDATE",
    "player_match_review",
    id,
    buildAuditContext(req.user!, req.ip),
    `Linked SAFF+ review ${id} → player ${playerId}`,
  );
  sendSuccess(res, row, "Linked");
}

export async function rejectPlayerReview(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const reason = (req.body as { reason?: string } | undefined)?.reason;
  const row = await playerReviewService.rejectReview(id, req.user!.id, reason);
  await logAudit(
    "UPDATE",
    "player_match_review",
    id,
    buildAuditContext(req.user!, req.ip),
    `Rejected SAFF+ review ${id}${reason ? `: ${reason}` : ""}`,
  );
  sendSuccess(res, row, "Rejected");
}

export async function markPlayerReviewDuplicate(
  req: AuthRequest,
  res: Response,
) {
  const { id } = req.params;
  const row = await playerReviewService.markDuplicate(id, req.user!.id);
  await logAudit(
    "UPDATE",
    "player_match_review",
    id,
    buildAuditContext(req.user!, req.ip),
    `Marked SAFF+ review ${id} as duplicate`,
  );
  sendSuccess(res, row, "Marked duplicate");
}

// ── Phase 3: Match events + media ──

export async function listMatchEvents(req: AuthRequest, res: Response) {
  const { matchId } = req.params;
  const events = await saffPlusService.getMatchEvents(matchId);
  sendSuccess(res, events);
}

export async function listMatchMedia(req: AuthRequest, res: Response) {
  const { matchId } = req.params;
  const media = await saffPlusService.getMatchMedia(matchId);
  sendSuccess(res, media);
}

export async function syncMatchEventsCtrl(req: AuthRequest, res: Response) {
  const { matchId } = req.params;
  const result = await saffPlusService.syncMatchEvents(matchId);
  await logAudit(
    "CREATE",
    "match_events",
    matchId,
    buildAuditContext(req.user!, req.ip),
    `SAFF+ event sync for match ${matchId}: ${result.upserted} events`,
  );
  sendSuccess(
    res,
    result,
    `${result.upserted} events upserted, ${result.unmappedPlayers} unmapped`,
  );
}

export async function syncMatchMediaCtrl(req: AuthRequest, res: Response) {
  const { matchId } = req.params;
  const result = await saffPlusService.syncMatchMedia(matchId);
  await logAudit(
    "CREATE",
    "match_media",
    matchId,
    buildAuditContext(req.user!, req.ip),
    `SAFF+ media sync for match ${matchId}: ${result.upserted} URLs (reason=${result.reason})`,
  );
  sendSuccess(res, result, `${result.upserted} media rows (${result.reason})`);
}

// ── Phase 4: Player profile enrichment ──

export async function syncPlayerCtrl(req: AuthRequest, res: Response) {
  const { sadaraPlayerId, saffPlayerId, overwrite } = req.body as {
    sadaraPlayerId: string;
    saffPlayerId: string;
    overwrite?: boolean;
  };
  const result = await saffPlusService.syncPlayerFromSaffPlus(
    sadaraPlayerId,
    saffPlayerId,
    { overwrite: overwrite ?? false },
    req.user!,
  );
  await logAudit(
    "UPDATE",
    "players",
    sadaraPlayerId,
    buildAuditContext(req.user!, req.ip),
    `SAFF+ player profile sync: saffPlayerId=${saffPlayerId} enriched=[${result.enriched.join(",")}]`,
  );
  sendSuccess(
    res,
    result,
    `Enriched ${result.enriched.length} fields; ${result.matchesLinked} matches linked`,
  );
}

export async function getLiveProfileBySadaraIdCtrl(
  req: AuthRequest,
  res: Response,
) {
  const { sadaraPlayerId } = req.params;
  const fresh = req.query.fresh === "1" || req.query.fresh === "true";
  const profile = await saffPlusService.getLiveProfileBySadaraId(
    sadaraPlayerId,
    { fresh },
  );
  sendSuccess(res, profile);
}

export async function getPlayerProfilePreviewCtrl(
  req: AuthRequest,
  res: Response,
) {
  const { saffPlayerId } = req.params;
  const fresh = req.query.fresh === "1" || req.query.fresh === "true";
  const profile = await saffPlusService.previewPlayerProfile(saffPlayerId, {
    fresh,
  });
  sendSuccess(res, profile);
}

// ── Auto-link: match Sadara players to SAFF+ by name + club + DOB ──

export async function autoLinkPlayerCtrl(req: AuthRequest, res: Response) {
  const { sadaraPlayerId } = req.params;
  const result = await saffPlusService.autoLinkPlayerToSaffPlus(sadaraPlayerId);
  await logAudit(
    "UPDATE",
    "players",
    sadaraPlayerId,
    buildAuditContext(req.user!, req.ip),
    `SAFF+ auto-link: outcome=${result.outcome} saffPlayerId=${result.saffPlayerId ?? "—"} score=${result.score?.toFixed(2) ?? "—"}`,
  );
  sendSuccess(res, result, `Auto-link: ${result.outcome}`);
}

export async function autoLinkAllPlayersCtrl(req: AuthRequest, res: Response) {
  const { limit, dryRun } = req.body as {
    limit?: number;
    dryRun?: boolean;
  };
  const result = await saffPlusService.autoLinkAllUnlinkedPlayers({
    limit,
    dryRun: dryRun ?? false,
  });
  await logAudit(
    "UPDATE",
    "players",
    null,
    buildAuditContext(req.user!, req.ip),
    `SAFF+ auto-link-all: linked=${result.linked} queued=${result.queued} skipped=${result.skipped} errors=${result.errors}${dryRun ? " (dryRun)" : ""}`,
  );
  sendSuccess(
    res,
    result,
    `linked=${result.linked} queued=${result.queued} skipped=${result.skipped} errors=${result.errors}`,
  );
}
