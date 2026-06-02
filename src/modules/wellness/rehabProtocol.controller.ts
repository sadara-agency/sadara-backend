import type { Response } from "express";
import {
  sendSuccess,
  sendPaginated,
  sendCreated,
} from "@shared/utils/apiResponse";
import type { AuthRequest } from "@shared/types";
import * as rehabService from "./rehabProtocol.service";
import type { ListRehabProtocolsQueryDTO } from "./rehabProtocol.validation";

// ── Protocols ──

export async function list(req: AuthRequest, res: Response): Promise<void> {
  const result = await rehabService.listRehabProtocols(
    req.query as ListRehabProtocolsQueryDTO,
    req.user,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function listForPlayer(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const data = await rehabService.listRehabProtocolsForPlayer(
    req.params.playerId,
    req.user,
  );
  sendSuccess(res, data);
}

export async function getById(req: AuthRequest, res: Response): Promise<void> {
  const data = await rehabService.getRehabProtocolById(req.params.id, req.user);
  sendSuccess(res, data);
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const data = await rehabService.createRehabProtocol(req.body, req.user!.id);
  sendCreated(res, data, "Rehab protocol created");
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  const data = await rehabService.updateRehabProtocol(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, data, "Rehab protocol updated");
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  const data = await rehabService.deleteRehabProtocol(req.params.id, req.user);
  sendSuccess(res, data, "Rehab protocol deleted");
}

export async function grantClearance(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const data = await rehabService.grantClearance(
    req.params.id,
    req.user!.id,
    req.user,
  );
  sendSuccess(res, data, "Clearance granted");
}

// ── Phases ──

export async function addPhase(req: AuthRequest, res: Response): Promise<void> {
  const data = await rehabService.addPhase(req.params.id, req.body, req.user);
  sendCreated(res, data, "Phase added");
}

export async function updatePhase(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const data = await rehabService.updatePhase(
    req.params.id,
    req.params.phaseId,
    req.body,
    req.user,
  );
  sendSuccess(res, data, "Phase updated");
}

export async function deletePhase(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const data = await rehabService.deletePhase(
    req.params.id,
    req.params.phaseId,
    req.user,
  );
  sendSuccess(res, data, "Phase deleted");
}

// ── Phase Exercises ──

export async function addPhaseExercise(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const data = await rehabService.addPhaseExercise(
    req.params.id,
    req.params.phaseId,
    req.body,
    req.user,
  );
  sendCreated(res, data, "Exercise added to phase");
}

export async function updatePhaseExercise(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const data = await rehabService.updatePhaseExercise(
    req.params.id,
    req.params.phaseId,
    req.params.exerciseId,
    req.body,
    req.user,
  );
  sendSuccess(res, data, "Phase exercise updated");
}

export async function deletePhaseExercise(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const data = await rehabService.deletePhaseExercise(
    req.params.id,
    req.params.phaseId,
    req.params.exerciseId,
    req.user,
  );
  sendSuccess(res, data, "Phase exercise removed");
}
