import type { Response } from "express";
import { createCrudController } from "@shared/utils/crudController";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { CachePrefix } from "@shared/utils/cache";
import type { AuthRequest } from "@shared/types";
import * as bodyCompositionService from "./bodyComposition.service";
import type { ListScansQueryDTO } from "./bodyComposition.validation";

const crud = createCrudController({
  service: {
    list: (query, user) => bodyCompositionService.listScans(query, user),
    getById: (id, user) => bodyCompositionService.getScanById(id, user),
    create: (body, userId) => bodyCompositionService.createScan(body, userId),
    update: (id, body) => bodyCompositionService.updateScan(id, body),
    delete: (id) => bodyCompositionService.deleteScan(id),
  },
  entity: "body-compositions",
  cachePrefixes: [CachePrefix.WELLNESS, CachePrefix.DASHBOARD],
  label: (item) => `Scan ${item.scanDate as string}`,
});

export const { list, getById, create, update, remove } = crud;

export async function listForPlayer(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const result = await bodyCompositionService.listScansForPlayer(
    req.params.playerId,
    req.query as unknown as ListScansQueryDTO,
    req.user,
  );
  const { data, meta } = result;
  sendPaginated(res, data, meta);
}

export async function getLatest(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const scan = await bodyCompositionService.getLatestScan(
    req.params.playerId,
    req.user,
  );
  sendSuccess(res, scan);
}
