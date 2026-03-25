import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import * as pressReleaseService from "./pressRelease.service";

const crud = createCrudController({
  service: {
    list: (query) => pressReleaseService.listPressReleases(query),
    getById: (id) => pressReleaseService.getPressReleaseById(id),
    create: (body, userId) =>
      pressReleaseService.createPressRelease(body, userId),
    update: (id, body) => pressReleaseService.updatePressRelease(id, body),
    delete: (id) => pressReleaseService.deletePressRelease(id),
  },
  entity: "press_releases",
  cachePrefixes: [],
  label: (r) => r.title,
});

export const { list, getById, create, update, remove } = crud;

// ── Custom: Get by slug ──

export async function getBySlug(req: AuthRequest, res: Response) {
  const release = await pressReleaseService.getPressReleaseBySlug(
    req.params.slug,
  );
  sendSuccess(res, release);
}

// ── Custom: Update Status ──

export async function updateStatus(req: AuthRequest, res: Response) {
  const release = await pressReleaseService.updatePressReleaseStatus(
    req.params.id,
    req.body,
    req.user!.id,
  );

  await logAudit(
    "UPDATE",
    "press_releases",
    release.id,
    buildAuditContext(req.user!, req.ip),
    `Press release status changed to ${release.status}`,
  );

  sendSuccess(res, release, `Status updated to ${release.status}`);
}
