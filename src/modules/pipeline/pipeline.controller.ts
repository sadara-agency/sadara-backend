// ─────────────────────────────────────────────────────────────
// src/modules/pipeline/pipeline.controller.ts
// ─────────────────────────────────────────────────────────────
import { Response, NextFunction } from "express";
import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix } from "@shared/utils/cache";
import { sendSuccess } from "@shared/utils/apiResponse";
import type { AuthRequest } from "@shared/types";
import * as pipelineService from "./pipeline.service";

// createCrudController wires service.list(req.query, req.user) and
// service.create(req.body, req.user.id). The list adapter passes the full
// AuthUser so resolvePartnerIdForUser can look up Partner.userId.
const crud = createCrudController({
  service: {
    list: (query, user) => pipelineService.listSubmissions(query, user),
    getById: (id) => pipelineService.getSubmissionById(id),
    // create(body, userId) — we ignore userId because submitPlayer validates
    // partnerId from the body and checks Partner status itself.
    create: (body, _userId) => pipelineService.submitPlayer(body),
    update: (id, body) => pipelineService.updateSubmission(id, body),
    delete: (id) => pipelineService.deleteSubmission(id),
  },
  entity: "pipeline",
  cachePrefixes: [CachePrefix.PIPELINE],
  label: (item) => item.playerNameEn ?? item.submissionRef,
});

export const { list, getById, create, update, remove } = crud;

export async function advancePhase(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const updated = await pipelineService.advancePhase(req.params.id, req.body);
    sendSuccess(res, updated, "Phase advanced");
  } catch (err) {
    next(err);
  }
}

export async function slaDigest(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const breaches = await pipelineService.getSlaBreaches();
    sendSuccess(res, breaches, `${breaches.length} SLA breaches found`);
  } catch (err) {
    next(err);
  }
}
