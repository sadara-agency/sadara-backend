import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import * as cycleService from "./evolution-cycle.service";

// ── List ──
export async function list(req: AuthRequest, res: Response) {
  const result = await cycleService.listEvolutionCycles(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

// ── Get by ID ──
export async function getById(req: AuthRequest, res: Response) {
  const cycle = await cycleService.getEvolutionCycleById(req.params.id);
  sendSuccess(res, cycle);
}

// ── Get player cycles ──
export async function getPlayerCycles(req: AuthRequest, res: Response) {
  const cycles = await cycleService.getPlayerEvolutionCycles(
    req.params.playerId,
  );
  sendSuccess(res, cycles);
}

// ── Create ──
export async function create(req: AuthRequest, res: Response) {
  const cycle = await cycleService.createEvolutionCycle(req.body, req.user!.id);

  await logAudit(
    "CREATE",
    "evolution-cycles",
    cycle.id,
    buildAuditContext(req.user!, req.ip),
    `Evolution cycle created: ${cycle.name}`,
  );

  sendCreated(res, cycle, "Evolution cycle created");
}

// ── Update ──
export async function update(req: AuthRequest, res: Response) {
  const cycle = await cycleService.updateEvolutionCycle(
    req.params.id,
    req.body,
  );

  await logAudit(
    "UPDATE",
    "evolution-cycles",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Evolution cycle updated: ${cycle.name}`,
  );

  sendSuccess(res, cycle, "Evolution cycle updated");
}

// ── Advance Phase ──
export async function advancePhase(req: AuthRequest, res: Response) {
  const cycle = await cycleService.advancePhase(req.params.id, req.body);

  await logAudit(
    "UPDATE",
    "evolution-cycles",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Evolution cycle phase advanced to ${cycle.currentPhase}: ${cycle.name}`,
  );

  sendSuccess(res, cycle, "Phase advanced successfully");
}

// ── Delete ──
export async function remove(req: AuthRequest, res: Response) {
  const cycle = await cycleService.deleteEvolutionCycle(req.params.id);

  await logAudit(
    "DELETE",
    "evolution-cycles",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Evolution cycle deleted: ${cycle.name}`,
  );

  sendSuccess(res, null, "Evolution cycle deleted");
}
