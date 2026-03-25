import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import * as mediaKitService from "./mediaKit.service";

// ── Generate Player Profile ──

export async function generatePlayerKit(req: AuthRequest, res: Response) {
  const generation = await mediaKitService.generatePlayerKit(
    req.params.playerId,
    req.body.language || "both",
    req.user!.id,
  );

  await logAudit(
    "CREATE",
    "media_kits",
    generation.id,
    buildAuditContext(req.user!, req.ip),
    `Generated player profile kit for ${req.params.playerId}`,
  );

  sendCreated(res, generation, "Player profile kit generated");
}

// ── Generate Squad Roster ──

export async function generateSquadKit(req: AuthRequest, res: Response) {
  const generation = await mediaKitService.generateSquadKit(
    req.params.clubId,
    req.body.language || "both",
    req.user!.id,
  );

  await logAudit(
    "CREATE",
    "media_kits",
    generation.id,
    buildAuditContext(req.user!, req.ip),
    `Generated squad roster kit for ${req.params.clubId}`,
  );

  sendCreated(res, generation, "Squad roster kit generated");
}

// ── History ──

export async function listHistory(req: AuthRequest, res: Response) {
  const result = await mediaKitService.listGenerationHistory(req.query);
  res.json({ success: true, data: result.data, meta: result.meta });
}

// ── Get by ID ──

export async function getById(req: AuthRequest, res: Response) {
  const generation = await mediaKitService.getGenerationById(req.params.id);
  sendSuccess(res, generation);
}
