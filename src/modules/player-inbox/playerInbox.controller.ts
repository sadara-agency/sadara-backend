import type { Response } from "express";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple } from "@shared/utils/cache";
import { CachePrefix } from "@shared/utils/cache";
import { logger } from "@config/logger";
import type { AuthRequest } from "@shared/types";
import * as svc from "./playerInbox.service";
import type {
  CreateInboxItemInput,
  UpdateInboxItemInput,
  CancelInboxItemInput,
  InboxQuery,
  MyInboxQuery,
} from "./playerInbox.validation";

const INVALIDATE = [CachePrefix.PLAYER_INBOX, CachePrefix.PORTAL];

function bustCache() {
  invalidateMultiple(INVALIDATE).catch((err) =>
    logger.warn("player-inbox cache invalidation failed", {
      error: (err as Error).message,
    }),
  );
}

// ── Staff handlers ──

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listInboxItems(
    req.query as unknown as InboxQuery,
    req.user!,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const item = await svc.getInboxItemById(req.params.id, req.user!);
  sendSuccess(res, item);
}

export async function create(req: AuthRequest, res: Response) {
  const ctx = buildAuditContext(req.user!, req.ip);
  const item = await svc.createInboxItem(
    req.body as CreateInboxItemInput,
    req.user!.id,
    ctx,
  );
  bustCache();
  sendCreated(res, item, "Inbox item issued");
}

export async function update(req: AuthRequest, res: Response) {
  const ctx = buildAuditContext(req.user!, req.ip);
  const item = await svc.updateInboxItem(
    req.params.id,
    req.body as UpdateInboxItemInput,
    req.user!,
    ctx,
  );
  bustCache();
  sendSuccess(res, item, "Inbox item updated");
}

export async function resolve(req: AuthRequest, res: Response) {
  const ctx = buildAuditContext(req.user!, req.ip);
  const item = await svc.resolveInboxItem(req.params.id, req.user!, ctx);
  bustCache();
  sendSuccess(res, item, "Inbox item resolved");
}

export async function cancel(req: AuthRequest, res: Response) {
  const ctx = buildAuditContext(req.user!, req.ip);
  const item = await svc.cancelInboxItem(
    req.params.id,
    req.body as CancelInboxItemInput,
    req.user!,
    ctx,
  );
  bustCache();
  sendSuccess(res, item, "Inbox item cancelled");
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deleteInboxItem(req.params.id, req.user!);
  bustCache();
  sendSuccess(res, result, "Inbox item deleted");
}

// ── Player handlers ──

export async function listMine(req: AuthRequest, res: Response) {
  const result = await svc.listMyInboxItems(
    req.user!.id,
    req.query as unknown as MyInboxQuery,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function summaryMine(req: AuthRequest, res: Response) {
  const summary = await svc.getMyInboxSummary(req.user!.id);
  sendSuccess(res, summary);
}

export async function getMineById(req: AuthRequest, res: Response) {
  const item = await svc.getMyInboxItemById(req.user!.id, req.params.id);
  bustCache();
  sendSuccess(res, item);
}

export async function acknowledge(req: AuthRequest, res: Response) {
  const ctx = buildAuditContext(req.user!, req.ip);
  const item = await svc.acknowledgeInboxItem(req.user!.id, req.params.id, ctx);
  bustCache();
  sendSuccess(res, item, "Acknowledged");
}
