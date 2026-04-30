import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix, invalidateMultiple } from "@shared/utils/cache";
import { sendSuccess } from "@shared/utils/apiResponse";
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

// ── Custom: publish ──

export async function publish(req: AuthRequest, res: Response): Promise<void> {
  const design = await designService.publishDesign(req.params.id);
  sendSuccess(res, design, "Design published");

  if (!req.user) return;
  const ctx = buildAuditContext(req.user, req.ip);
  Promise.all([
    invalidateMultiple([CachePrefix.DESIGNS, CachePrefix.DASHBOARD]),
    logAudit(
      "UPDATE",
      "designs",
      design.id,
      ctx,
      `Published "${design.title}"`,
    ),
  ]).catch((err) => logger.warn("design.publish side-effects failed", { err }));
}
