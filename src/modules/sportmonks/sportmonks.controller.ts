import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "../../shared/utils/audit";
import * as svc from "./sportmonks.service";

export async function getFixtures(req: AuthRequest, res: Response) {
  const { from, to, leagueId } = req.query as {
    from?: string;
    to?: string;
    leagueId?: string;
  };
  if (!from || !to) {
    res.status(400).json({ success: false, message: "from and to date params required" });
    return;
  }
  const fixtures = await svc.fetchFixtures(from, to, leagueId ? Number(leagueId) : undefined);
  sendSuccess(res, fixtures);
}

export async function importFixtures(req: AuthRequest, res: Response) {
  const { fixtureIds, from, to, leagueId } = req.body;
  if (!fixtureIds?.length || !from || !to) {
    res.status(400).json({ success: false, message: "fixtureIds array and from/to dates required" });
    return;
  }
  const result = await svc.importFixtures(fixtureIds, from, to, leagueId);
  await logAudit(
    "CREATE",
    "matches",
    null,
    buildAuditContext(req.user!, req.ip),
    `Imported ${result.imported} fixtures from Sportmonks (${result.updated} updated, ${result.skipped} skipped)`,
  );
  sendSuccess(res, result);
}

export async function getLeagues(_req: AuthRequest, res: Response) {
  const leagues = await svc.fetchLeagues();
  sendSuccess(res, leagues);
}

export async function getTeamMappings(_req: AuthRequest, res: Response) {
  const mappings = await svc.getTeamMappings();
  sendSuccess(res, mappings);
}

export async function mapTeam(req: AuthRequest, res: Response) {
  const sportmonksTeamId = Number(req.params.sportmonksTeamId);
  const { clubId } = req.body;
  if (!clubId || isNaN(sportmonksTeamId)) {
    res.status(400).json({ success: false, message: "clubId required" });
    return;
  }
  await svc.mapTeam(sportmonksTeamId, clubId);
  await logAudit(
    "UPDATE",
    "clubs",
    clubId,
    buildAuditContext(req.user!, req.ip),
    `Mapped Sportmonks team ${sportmonksTeamId} to club`,
  );
  sendSuccess(res, { sportmonksTeamId, clubId });
}

export async function searchTeamsHandler(req: AuthRequest, res: Response) {
  const q = (req.query.q as string) || "";
  if (!q || q.length < 2) {
    res.status(400).json({ success: false, message: "Search query must be at least 2 characters" });
    return;
  }
  const teams = await svc.searchTeams(q);
  sendSuccess(res, teams);
}

export async function testConnectionHandler(_req: AuthRequest, res: Response) {
  const ok = await svc.testConnection();
  sendSuccess(res, { connected: ok });
}
