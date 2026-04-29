// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.backfill.controller.ts
// Phase D handlers — historical backfill + headshots + run history.
// ─────────────────────────────────────────────────────────────

import { Response } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import type { AuthRequest } from "@shared/types";
import {
  listAvailableSeasons,
  backfillSeason,
  backfillAllHistoricalSeasons,
  type BackfillScope,
} from "@modules/spl/spl.backfill.service";
import { ingestHeadshotsForPlayersMissingPhoto } from "@modules/spl/spl.headshots.service";
import { SplBackfillRun } from "@modules/spl/spl.backfillRun.model";

export async function getSeasons(_req: AuthRequest, res: Response) {
  const seasons = await listAvailableSeasons();
  sendSuccess(res, seasons);
}

export async function triggerBackfillSeason(req: AuthRequest, res: Response) {
  const { seasonId, scope } = req.body as {
    seasonId: number;
    scope: BackfillScope;
  };
  const result = await backfillSeason(seasonId, scope);
  await logAudit(
    "CREATE",
    "matches",
    null,
    buildAuditContext(req.user!, req.ip),
    `SPL backfill season=${seasonId}: errors=${result.errors.length}`,
  );
  sendSuccess(res, result, `Backfill season ${seasonId} done`);
}

export async function triggerBackfillAll(req: AuthRequest, res: Response) {
  const { scope, fromYear } = req.body as {
    scope: BackfillScope;
    fromYear?: number;
  };
  // Long-running — kick off in background, return immediately.
  void backfillAllHistoricalSeasons(scope, { fromYear });
  await logAudit(
    "CREATE",
    "matches",
    null,
    buildAuditContext(req.user!, req.ip),
    `SPL backfill all started (fromYear=${fromYear ?? "all"})`,
  );
  sendSuccess(
    res,
    { started: true, fromYear: fromYear ?? null, scope },
    "Backfill started in background — track via /spl/backfill/runs",
  );
}

export async function triggerHeadshotsSync(req: AuthRequest, res: Response) {
  const result = await ingestHeadshotsForPlayersMissingPhoto();
  await logAudit(
    "UPDATE",
    "players",
    null,
    buildAuditContext(req.user!, req.ip),
    `SPL headshots ingested — checked=${result.checked} updated=${result.updated}`,
  );
  sendSuccess(res, result, `Updated ${result.updated} player photos`);
}

export async function listBackfillRuns(_req: AuthRequest, res: Response) {
  const runs = await SplBackfillRun.findAll({
    order: [["startedAt", "DESC"]],
    limit: 100,
  });
  sendSuccess(res, runs);
}
