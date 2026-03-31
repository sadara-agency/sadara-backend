// ─────────────────────────────────────────────────────────────
// SPL Intelligence Controller
// ─────────────────────────────────────────────────────────────

import { Response } from "express";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import { logger } from "@config/logger";
import { AuthRequest } from "@shared/types";
import * as service from "@modules/spl/spl.intelligence.service";
import { analyzeLeagueIntelligence } from "@cron/engines/spl.intelligence.engine";

// ── Insights ──

export async function getInsights(req: AuthRequest, res: Response) {
  const result = await service.listInsights(req.query as any);
  sendSuccess(res, result);
}

export async function dismiss(req: AuthRequest, res: Response) {
  const insight = await service.dismissInsight(req.params.id);
  sendSuccess(res, insight);
}

export async function addToWatchlist(req: AuthRequest, res: Response) {
  const result = await service.addInsightToWatchlist(
    req.params.id,
    req.user!.id,
  );
  sendCreated(res, result);
}

// ── Tracked Players ──

export async function getTrackedPlayers(req: AuthRequest, res: Response) {
  const players = await service.listTrackedPlayers(req.user!.id);
  sendSuccess(res, players);
}

export async function track(req: AuthRequest, res: Response) {
  const tracked = await service.trackPlayer(req.user!.id, req.body);
  sendCreated(res, tracked);
}

export async function untrack(req: AuthRequest, res: Response) {
  await service.untrackPlayer(req.user!.id, req.params.id);
  sendSuccess(res, { message: "Player untracked" });
}

export async function updateAlerts(req: AuthRequest, res: Response) {
  const tracked = await service.updateTrackingAlerts(
    req.params.id,
    req.user!.id,
    req.body.alertConfig,
  );
  sendSuccess(res, tracked);
}

export async function getTrackedDetail(req: AuthRequest, res: Response) {
  const result = await service.getTrackedPlayerDetail(
    req.params.id,
    req.user!.id,
  );
  sendSuccess(res, result);
}

// ── Manual Analysis Trigger ──

export async function triggerAnalysis(_req: AuthRequest, res: Response) {
  sendSuccess(res, null, "Intelligence analysis started in background.");

  analyzeLeagueIntelligence()
    .then((result) => {
      logger.info(
        `[SPL Intelligence] ✓ Manual: ${result.insightsCreated} insights from ${result.playersAnalyzed} players across ${result.competitionsScanned} competitions`,
      );
    })
    .catch((err) => {
      logger.error(`[SPL Intelligence] ✗ Manual failed: ${err.message}`);
    });
}

// ── Competitions ──

export async function getCompetitions(_req: AuthRequest, res: Response) {
  const comps = await service.listCompetitions();
  sendSuccess(res, comps);
}

export async function toggleComp(req: AuthRequest, res: Response) {
  const comp = await service.toggleCompetition(
    req.params.id,
    req.body.isActive,
  );
  sendSuccess(res, comp);
}

// ── Status ──

export async function getStatus(_req: AuthRequest, res: Response) {
  const status = await service.getIntelligenceStatus();
  sendSuccess(res, status);
}

// ── Config ──

export async function getConfig(_req: AuthRequest, res: Response) {
  sendSuccess(res, service.getIntelligenceConfig());
}

export async function updateConfig(req: AuthRequest, res: Response) {
  const config = await service.updateIntelligenceConfig(req.body);
  sendSuccess(res, config);
}
