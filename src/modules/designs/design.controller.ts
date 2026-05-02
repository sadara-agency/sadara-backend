import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { AppError } from "@middleware/errorHandler";
import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix, invalidateMultiple } from "@shared/utils/cache";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { logger } from "@config/logger";
import * as designService from "./design.service";

const crud = createCrudController({
  service: {
    list: (query, user) => designService.listDesigns(query, user),
    getById: (id, user) => designService.getDesignById(id, user),
    create: (body, userId) => designService.createDesign(body, userId),
    update: (id, body) => designService.updateDesign(id, body),
    delete: (id) => designService.deleteDesign(id),
  },
  entity: "designs",
  cachePrefixes: [CachePrefix.DESIGNS, CachePrefix.DASHBOARD],
  label: (d) => d.title,
});

export const { list, getById, create, update, remove } = crud;

function sideEffects(
  req: AuthRequest,
  action: string,
  design: { id: string; title: string },
) {
  if (!req.user) return;
  const ctx = buildAuditContext(req.user, req.ip);
  Promise.all([
    invalidateMultiple([CachePrefix.DESIGNS, CachePrefix.DASHBOARD]),
    logAudit(
      "UPDATE",
      "designs",
      design.id,
      ctx,
      `${action} "${design.title}"`,
    ),
  ]).catch((err) =>
    logger.warn(`design.${action} side-effects failed`, { err }),
  );
}

// ── Quick Content ──

export async function quickCreate(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.user) throw new AppError("Unauthorized", 401);
  const design = await designService.createQuickContent(req.body, req.user.id);
  sendCreated(res, design, "Content created");
  sideEffects(req, "quickCreate", design);
}

// ── Workflow actions ──

export async function submitForApproval(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.user) throw new AppError("Unauthorized", 401);
  const design = await designService.submitForApproval(req.params.id, req.user);
  sendSuccess(res, design, "Submitted for approval");
  sideEffects(req, "submitForApproval", design);
}

export async function approve(req: AuthRequest, res: Response): Promise<void> {
  const design = await designService.approveDesign(req.params.id);
  sendSuccess(res, design, "Design approved");
  sideEffects(req, "approve", design);
}

export async function requestChanges(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.user) throw new AppError("Unauthorized", 401);
  const design = await designService.requestChanges(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, design, "Changes requested");
  sideEffects(req, "requestChanges", design);
}

export async function reject(req: AuthRequest, res: Response): Promise<void> {
  const design = await designService.rejectDesign(req.params.id, req.body);
  sendSuccess(res, design, "Design rejected");
  sideEffects(req, "reject", design);
}

export async function markPublished(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const design = await designService.markPublished(req.params.id, req.body);
  sendSuccess(res, design, "Marked as published");
  sideEffects(req, "markPublished", design);
}

export async function postpone(req: AuthRequest, res: Response): Promise<void> {
  const design = await designService.postponeDesign(req.params.id);
  sendSuccess(res, design, "Design postponed");
  sideEffects(req, "postpone", design);
}

// ── Legacy alias ──

export async function publish(req: AuthRequest, res: Response): Promise<void> {
  const design = await designService.publishDesign(req.params.id);
  sendSuccess(res, design, "Design published");
  sideEffects(req, "publish", design);
}

// ── Upload asset ──

export async function uploadAsset(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.file) throw new AppError("No file uploaded", 400);
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const design = await designService.uploadDesignAsset(
    req.params.id,
    {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    },
    baseUrl,
  );
  sendSuccess(res, design, "Asset uploaded");
  sideEffects(req, "uploadAsset", design);
}
