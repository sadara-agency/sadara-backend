import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import * as journeyService from "./journey.service";

// ── List ──
export async function list(req: AuthRequest, res: Response) {
  const result = await journeyService.listJourneys(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

// ── Get by ID ──
export async function getById(req: AuthRequest, res: Response) {
  const stage = await journeyService.getJourneyById(req.params.id);
  sendSuccess(res, stage);
}

// ── Get player journey (all stages for a player) ──
export async function getPlayerJourney(req: AuthRequest, res: Response) {
  const stages = await journeyService.getPlayerJourney(req.params.playerId);
  sendSuccess(res, stages);
}

// ── Create ──
export async function create(req: AuthRequest, res: Response) {
  const stage = await journeyService.createJourney(req.body, req.user!.id);

  await logAudit(
    "CREATE",
    "journey",
    stage.id,
    buildAuditContext(req.user!, req.ip),
    `Journey stage created: ${stage.stageName}`,
  );

  sendCreated(res, stage, "Journey stage created");
}

// ── Update ──
export async function update(req: AuthRequest, res: Response) {
  const stage = await journeyService.updateJourney(req.params.id, req.body);

  await logAudit(
    "UPDATE",
    "journey",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Journey stage updated: ${stage.stageName}`,
  );

  sendSuccess(res, stage, "Journey stage updated");
}

// ── Delete ──
export async function remove(req: AuthRequest, res: Response) {
  const stage = await journeyService.deleteJourney(req.params.id);

  await logAudit(
    "DELETE",
    "journey",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Journey stage deleted: ${stage.stageName}`,
  );

  sendSuccess(res, null, "Journey stage deleted");
}

// ── Reorder ──
export async function reorder(req: AuthRequest, res: Response) {
  const stages = await journeyService.reorderStages(req.body);

  await logAudit(
    "UPDATE",
    "journey",
    null,
    buildAuditContext(req.user!, req.ip),
    `Journey stages reordered for player ${req.body.playerId}`,
  );

  sendSuccess(res, stages, "Stages reordered");
}
