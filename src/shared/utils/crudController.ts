import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext, buildChanges } from "@shared/utils/audit";
import { invalidateMultiple } from "@shared/utils/cache";
import { logger } from "@config/logger";

// ── Types ──

type Handler = (req: AuthRequest, res: Response) => Promise<void>;

interface CrudService {
  list(
    query: any,
    ...args: any[]
  ): Promise<{ data: any[]; meta: any; [key: string]: any }>;
  getById(id: string, ...args: any[]): Promise<any>;
  create(body: any, userId: string): Promise<any>;
  update(id: string, body: any, ...args: any[]): Promise<any>;
  delete(id: string, ...args: any[]): Promise<any>;
}

interface CrudConfig {
  /** The service object with list/getById/create/update/delete methods */
  service: CrudService;
  /** Entity name for audit logs (e.g. "players", "contracts") */
  entity: string;
  /** Cache prefixes to invalidate on mutations */
  cachePrefixes: string[];
  /** Extract a display label from the entity for audit messages (e.g. item => item.title) */
  label?: (item: any) => string;
  /**
   * Extra cache prefixes to invalidate on delete (in addition to cachePrefixes).
   * Use when deleting an entity affects more caches than create/update.
   */
  deleteCachePrefixes?: string[];
}

// ── Factory ──

/**
 * Creates standard CRUD controller handlers with automatic audit logging
 * and cache invalidation. Returns { list, getById, create, update, remove }
 * that can be spread into a controller module or extended with custom handlers.
 *
 * @example
 * ```ts
 * const crud = createCrudController({
 *   service: playerService,
 *   entity: "players",
 *   cachePrefixes: [CachePrefix.PLAYERS, CachePrefix.DASHBOARD],
 *   label: (p) => `${p.firstName} ${p.lastName}`,
 * });
 *
 * export const { list, getById, create, remove } = crud;
 * export const update = crud.update; // or override with custom logic
 * ```
 */
export function createCrudController(config: CrudConfig) {
  const { service, entity, cachePrefixes, label, deleteCachePrefixes } = config;

  const entityLabel = entity.charAt(0).toUpperCase() + entity.slice(1);

  function getLabel(item: any): string {
    if (label) return label(item);
    return item?.title || item?.name || item?.nameEn || item?.id || "";
  }

  const list: Handler = async (req, res) => {
    const result = await service.list(req.query);
    const { data, meta, ...extras } = result;
    sendPaginated(
      res,
      data,
      meta,
      undefined,
      Object.keys(extras).length > 0 ? extras : undefined,
    );
  };

  const getById: Handler = async (req, res) => {
    const item = await service.getById(req.params.id);
    sendSuccess(res, item);
  };

  const create: Handler = async (req, res) => {
    const item = await service.create(req.body, req.user!.id);
    sendCreated(res, item);
    // Fire-and-forget: audit + cache invalidation (don't block response)
    Promise.all([
      logAudit(
        "CREATE",
        entity,
        item.id,
        buildAuditContext(req.user!, req.ip),
        `Created ${entity.slice(0, -1)}: ${getLabel(item)}`,
      ),
      invalidateMultiple(cachePrefixes),
    ]).catch((err) =>
      logger.warn("Post-create side-effects failed", {
        entity,
        error: (err as Error).message,
      }),
    );
  };

  const update: Handler = async (req, res) => {
    const oldItem = await service.getById(req.params.id);
    const item = await service.update(req.params.id, req.body);
    sendSuccess(res, item, `${entityLabel.slice(0, -1)} updated`);

    // Fire-and-forget: audit + cache invalidation (don't block response)
    const oldPlain =
      oldItem instanceof Object
        ? ((oldItem as any).get?.({ plain: true }) ?? oldItem)
        : oldItem;
    const changes = buildChanges(oldPlain, req.body);

    Promise.all([
      logAudit(
        "UPDATE",
        entity,
        item.id ?? req.params.id,
        buildAuditContext(req.user!, req.ip),
        `Updated ${entity.slice(0, -1)}: ${getLabel(item)}`,
        changes ?? undefined,
      ),
      invalidateMultiple(cachePrefixes),
    ]).catch((err) =>
      logger.warn("Post-update side-effects failed", {
        entity,
        error: (err as Error).message,
      }),
    );
  };

  const remove: Handler = async (req, res) => {
    const result = await service.delete(req.params.id);
    sendSuccess(res, result, `${entityLabel.slice(0, -1)} deleted`);
    // Fire-and-forget: audit + cache invalidation (don't block response)
    Promise.all([
      logAudit(
        "DELETE",
        entity,
        result.id,
        buildAuditContext(req.user!, req.ip),
        `${entityLabel.slice(0, -1)} deleted`,
      ),
      invalidateMultiple(deleteCachePrefixes ?? cachePrefixes),
    ]).catch((err) =>
      logger.warn("Post-delete side-effects failed", {
        entity,
        error: (err as Error).message,
      }),
    );
  };

  return { list, getById, create, update, remove };
}
