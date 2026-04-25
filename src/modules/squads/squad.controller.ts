// ─────────────────────────────────────────────────────────────
// src/modules/squads/squad.controller.ts
// Read-only HTTP layer for the squads module. Squad creation is
// driven by the SAFF wizard (Phase 3) via squadService.findOrCreateSquad,
// not exposed as a public endpoint.
// ─────────────────────────────────────────────────────────────
import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import * as squadService from "@modules/squads/squad.service";
import type { SquadQuery } from "@modules/squads/squad.validation";

export async function list(req: AuthRequest, res: Response) {
  const result = await squadService.listSquads(
    req.query as unknown as SquadQuery,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const squad = await squadService.getSquadById(req.params.id);
  sendSuccess(res, squad);
}

export async function listByClub(req: AuthRequest, res: Response) {
  const squads = await squadService.listByClub(req.params.clubId);
  sendSuccess(res, squads);
}
