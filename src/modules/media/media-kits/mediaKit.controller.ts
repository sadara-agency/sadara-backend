import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNotFound,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { streamFileBuffer } from "@shared/utils/storage";
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
// Streams the PDF through the backend so the frontend never needs a signed URL.
// The service account's read access is sufficient — no signing permissions required.

export async function download(req: AuthRequest, res: Response) {
  const generation = await mediaKitService.getGenerationById(req.params.id);
  const fileUrl = (generation as unknown as { fileUrl?: string | null })
    .fileUrl;

  if (!fileUrl) {
    sendNotFound(res, "PDF");
    return;
  }

  // If already an absolute URL (external storage), redirect
  if (fileUrl.startsWith("http")) {
    res.redirect(302, fileUrl);
    return;
  }

  try {
    const buffer = await streamFileBuffer(fileUrl);
    const filename = fileUrl.split("/").pop() || "media-kit.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch {
    sendNotFound(res, "PDF file");
  }
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
