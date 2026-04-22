import type { Response } from "express";
import { createCrudController } from "@shared/utils/crudController";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { CachePrefix } from "@shared/utils/cache";
import type { AuthRequest } from "@shared/types";
import * as trainingBlockService from "./trainingBlock.service";
import type {
  ListBlocksQueryDTO,
  CloseBlockDTO,
  PauseBlockDTO,
} from "./trainingBlock.validation";

const crud = createCrudController({
  service: {
    list: (query, user) =>
      trainingBlockService.listBlocks(query as ListBlocksQueryDTO, user),
    getById: (id, user) => trainingBlockService.getBlockById(id, user),
    create: (body, userId) => trainingBlockService.openBlock(body, userId),
    update: (id, body) => trainingBlockService.updateBlock(id, body),
    delete: (id) => trainingBlockService.deleteBlock(id),
  },
  entity: "training-blocks",
  cachePrefixes: [CachePrefix.WELLNESS, CachePrefix.DASHBOARD],
  label: (item) => `Block ${item.goal as string} ${item.startedAt as string}`,
});

export const { list, getById, create, update, remove } = crud;

export async function listForPlayer(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const result = await trainingBlockService.listBlocksForPlayer(
    req.params.playerId,
    req.query as unknown as ListBlocksQueryDTO,
    req.user,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function getActive(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const block = await trainingBlockService.getActiveBlock(
    req.params.playerId,
    req.user,
  );
  // Returns null (not 404) when no active block exists
  sendSuccess(res, block);
}

export async function pause(req: AuthRequest, res: Response): Promise<void> {
  const block = await trainingBlockService.pauseBlock(
    req.params.id,
    req.body as PauseBlockDTO,
  );
  sendSuccess(res, block);
}

export async function resume(req: AuthRequest, res: Response): Promise<void> {
  const block = await trainingBlockService.resumeBlock(req.params.id);
  sendSuccess(res, block);
}

export async function close(req: AuthRequest, res: Response): Promise<void> {
  const block = await trainingBlockService.closeBlock(
    req.params.id,
    req.body as CloseBlockDTO,
    req.user!.id,
  );
  sendSuccess(res, block);
}
