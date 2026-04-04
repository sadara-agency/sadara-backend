import { Response } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { AuthRequest } from "@shared/types";
import * as saffPlusService from "./saffplus.service";
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
