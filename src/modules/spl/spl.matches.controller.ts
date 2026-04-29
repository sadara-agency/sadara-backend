// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.matches.controller.ts
// Handlers for Phase A — Pulselive fixtures + match details + events.
// ─────────────────────────────────────────────────────────────

import { Response } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import type { AuthRequest } from "@shared/types";
import * as matchesSync from "@modules/spl/spl.matches.sync";
import { fetchFixtures } from "@modules/spl/spl.fixtures.pulselive";
import type { PulseLiveFixtureStatus } from "@modules/spl/spl.fixtures.types";

export async function triggerSyncFixtures(req: AuthRequest, res: Response) {
  const { seasonId, statuses, teamId } = req.body as {
    seasonId?: number;
    statuses?: PulseLiveFixtureStatus[];
    teamId?: number;
  };
  const summary = await matchesSync.syncFixtures(seasonId, {
    statuses,
    pulseLiveTeamId: teamId,
  });
  await logAudit(
    "CREATE",
    "matches",
    null,
    buildAuditContext(req.user!, req.ip),
    `SPL fixtures sync — fetched=${summary.fetched} created=${summary.created} updated=${summary.updated}`,
  );
  sendSuccess(
    res,
    summary,
    `Synced ${summary.fetched} fixtures from Pulselive`,
  );
}

export async function triggerSyncFixtureDetail(
  req: AuthRequest,
  res: Response,
) {
  const id = Number(req.params.pulselivefixtureId);
  const result = await matchesSync.syncFixtureDetail(id);
  await logAudit(
    "CREATE",
    "match_events",
    result.matchId,
    buildAuditContext(req.user!, req.ip),
    `SPL fixture detail ${id}: ${result.eventsUpserted} events`,
  );
  sendSuccess(res, result, `Synced ${result.eventsUpserted} events`);
}

export async function triggerSyncAllFixtureDetails(
  req: AuthRequest,
  res: Response,
) {
  const { seasonId, sinceDate } = req.body as {
    seasonId?: number;
    sinceDate?: string;
  };
  const result = await matchesSync.syncAllFixtureDetails(seasonId, sinceDate);
  await logAudit(
    "CREATE",
    "match_events",
    null,
    buildAuditContext(req.user!, req.ip),
    `SPL all-fixture-details sync — fixtures=${result.fixtures} events=${result.events}`,
  );
  sendSuccess(res, result, `Processed ${result.fixtures} fixtures`);
}

export async function getProviderFixturesDryRun(
  req: AuthRequest,
  res: Response,
) {
  const seasonId = req.query.seasonId ? Number(req.query.seasonId) : undefined;
  const statuses = req.query.statuses
    ? (String(req.query.statuses).split(",") as PulseLiveFixtureStatus[])
    : undefined;
  const fixtures = await fetchFixtures(seasonId, { statuses });
  sendSuccess(res, {
    total: fixtures.length,
    fixtures,
  });
}
