import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix } from "@shared/utils/cache";
import * as mediaRequestService from "./mediaRequest.service";

const crud = createCrudController({
  service: {
    list: (query) => mediaRequestService.listMediaRequests(query),
    getById: (id) => mediaRequestService.getMediaRequestById(id),
    create: (body, userId) =>
      mediaRequestService.createMediaRequest(body, userId),
    update: (id, body) => mediaRequestService.updateMediaRequest(id, body),
    delete: (id) => mediaRequestService.deleteMediaRequest(id),
  },
  entity: "media_requests",
  cachePrefixes: [CachePrefix.MEDIA_REQUESTS],
  label: (r) => `${r.requestType}: ${r.subject}`,
});

export const { list, getById, create, update, remove } = crud;

// ── Custom: Update Status ──

export async function updateStatus(req: AuthRequest, res: Response) {
  const request = await mediaRequestService.updateMediaRequestStatus(
    req.params.id,
    req.body,
  );

  await logAudit(
    "UPDATE",
    "media_requests",
    request.id,
    buildAuditContext(req.user!, req.ip),
    `Media request status changed to ${request.status}`,
  );

  sendSuccess(res, request, `Status updated to ${request.status}`);
}
