import type { Response } from "express";
import { createCrudController } from "@shared/utils/crudController";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { CachePrefix } from "@shared/utils/cache";
import type { AuthRequest } from "@shared/types";
import * as recoveryService from "./recoveryActivity.service";
import type { ListRecoveryActivityQueryDTO } from "./recoveryActivity.validation";

const crud = createCrudController({
  service: {
    list: (query, user) => recoveryService.listRecoveryActivities(query, user),
    getById: (id, user) => recoveryService.getRecoveryActivityById(id, user),
    create: (body, userId) =>
      recoveryService.createRecoveryActivity(body, userId),
    update: (id, body) => recoveryService.updateRecoveryActivity(id, body),
    delete: (id) => recoveryService.deleteRecoveryActivity(id),
  },
  entity: "recovery-activities",
  cachePrefixes: [CachePrefix.WELLNESS, CachePrefix.DASHBOARD],
  label: (item) => `Recovery ${item.activityDate as string}`,
});

export const { list, getById, create, update, remove } = crud;

export async function myToday(req: AuthRequest, res: Response): Promise<void> {
  const playerId = (req.user as { playerId?: string } | undefined)?.playerId;
  if (!playerId) {
    sendSuccess(res, null, "Player account not linked");
    return;
  }
  const data = await recoveryService.getTodayRecoveryForPlayer(
    playerId,
    req.user,
  );
  sendSuccess(res, data);
}

export async function myRecent(req: AuthRequest, res: Response): Promise<void> {
  const playerId = (req.user as { playerId?: string } | undefined)?.playerId;
  if (!playerId) {
    sendSuccess(res, [], "Player account not linked");
    return;
  }
  const result = await recoveryService.listRecoveryForPlayer(
    playerId,
    req.query as unknown as ListRecoveryActivityQueryDTO,
    req.user,
  );
  sendPaginated(res, result.data, result.meta);
}
