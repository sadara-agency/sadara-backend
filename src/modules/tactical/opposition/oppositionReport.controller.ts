import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix } from "@shared/utils/cache";
import { sendSuccess } from "@shared/utils/apiResponse";
import type { Response } from "express";
import type { AuthRequest } from "@shared/types";
import * as service from "./oppositionReport.service";

const crud = createCrudController({
  service: {
    list: (query, user) => service.listOppositionReports(query, user),
    getById: (id, user) => service.getOppositionReportById(id, user),
    create: (body, userId) => service.createOppositionReport(body, userId),
    update: (id, body) => service.updateOppositionReport(id, body),
    delete: (id) => service.deleteOppositionReport(id),
  },
  entity: "opposition_reports",
  cachePrefixes: [CachePrefix.OPPOSITION_REPORTS],
  label: (item) => item.opponentName ?? item.id,
});

export const { list, getById, create, update, remove } = crud;

export async function publish(req: AuthRequest, res: Response) {
  const record = await service.publishOppositionReport(req.params.id);
  sendSuccess(res, record, "Report published");
}
