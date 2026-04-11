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

  logAudit(
    "CREATE",
    "media_kits",
    generation.id,
    buildAuditContext(req.user!, req.ip),
    `Generated player profile kit for ${req.params.playerId}`,
  ).catch(() => {});

  sendCreated(res, generation, "Player profile kit generated");
}

// ── Generate Squad Roster ──

export async function generateSquadKit(req: AuthRequest, res: Response) {
  const generation = await mediaKitService.generateSquadKit(
    req.params.clubId,
    req.body.language || "both",
    req.user!.id,
  );

  logAudit(
    "CREATE",
    "media_kits",
    generation.id,
    buildAuditContext(req.user!, req.ip),
    `Generated squad roster kit for ${req.params.clubId}`,
  ).catch(() => {});

  sendCreated(res, generation, "Squad roster kit generated");
}

// ── Download ──

export async function download(req: AuthRequest, res: Response) {
  const url = await mediaKitService.getDownloadUrl(req.params.id);
  sendSuccess(res, { downloadUrl: url });
}

// ── History ──

export async function listHistory(req: AuthRequest, res: Response) {
  const result = await mediaKitService.listGenerationHistory(req.query);
  sendPaginated(res, result.data, result.meta);
}

// ── Get by ID ──

export async function getById(req: AuthRequest, res: Response) {
  const generation = await mediaKitService.getGenerationById(req.params.id);
  sendSuccess(res, generation);
}
