// ─────────────────────────────────────────────────────────────
// src/modules/analystviews/analystview.controller.ts
// HTTP layer wired through createCrudController for audit + cache
// invalidation, with one custom handler (markViewed).
// ─────────────────────────────────────────────────────────────
import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix } from "@shared/utils/cache";
import * as analystViewService from "@modules/analystviews/analystview.service";

const crud = createCrudController({
  service: {
    list: (query, user) =>
      analystViewService.listAnalystViews(query, user) as Promise<{
        data: any[];
        meta: any;
      }>,
    getById: (id, user) => analystViewService.getAnalystViewById(id, user),
    create: (body, userId) =>
      analystViewService.createAnalystView(body, userId),
    update: (id, body, user) =>
      analystViewService.updateAnalystView(id, body, user as any),
    delete: (id, user) => analystViewService.deleteAnalystView(id, user as any),
  },
  entity: "analyst_views",
  cachePrefixes: [CachePrefix.ANALYST_VIEWS],
  label: (item) => item.name ?? item.id,
});

export const { list, getById, create, remove } = crud;

// `update` is wrapped because the service needs `req.user` for the owner
// check and the factory's update handler doesn't pass user through.
export async function update(req: AuthRequest, res: Response) {
  const item = await analystViewService.updateAnalystView(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, item, "Analyst view updated");
}

export async function markViewed(req: AuthRequest, res: Response) {
  const item = await analystViewService.recordAnalystViewSeen(
    req.params.id,
    req.user,
  );
  sendSuccess(res, item);
}
