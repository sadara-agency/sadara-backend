import { Response } from "express";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import type { AuthRequest } from "@shared/types";
import * as financialsService from "./injuryFinancials.service";

export async function list(req: AuthRequest, res: Response) {
  const result = await financialsService.listInjuryFinancials(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const record = await financialsService.getInjuryFinancialsById(req.params.id);
  sendSuccess(res, record);
}

export async function getByInjury(req: AuthRequest, res: Response) {
  const record = await financialsService.getInjuryFinancialsByInjury(
    req.params.injuryId,
  );
  sendSuccess(res, record ?? null);
}

export async function create(req: AuthRequest, res: Response) {
  const record = await financialsService.createInjuryFinancials(
    req.body,
    req.user!.id,
  );
  Promise.all([
    invalidateMultiple([
      CachePrefix.INJURY_FINANCIALS,
      CachePrefix.INJURIES,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "CREATE",
      "injury_financials",
      record.id,
      buildAuditContext(req.user!, req.ip),
      `Financial impact record created for injury ${record.injuryId}`,
    ),
  ]).catch(() => {});
  sendCreated(res, record);
}

export async function update(req: AuthRequest, res: Response) {
  const record = await financialsService.updateInjuryFinancials(
    req.params.id,
    req.body,
  );
  Promise.all([
    invalidateMultiple([CachePrefix.INJURY_FINANCIALS, CachePrefix.INJURIES]),
    logAudit(
      "UPDATE",
      "injury_financials",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Injury financials updated",
    ),
  ]).catch(() => {});
  sendSuccess(res, record);
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await financialsService.deleteInjuryFinancials(req.params.id);
  Promise.all([
    invalidateMultiple([
      CachePrefix.INJURY_FINANCIALS,
      CachePrefix.INJURIES,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "DELETE",
      "injury_financials",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Injury financials deleted",
    ),
  ]).catch(() => {});
  sendSuccess(res, result);
}

export async function compute(req: AuthRequest, res: Response) {
  const record = await financialsService.computeFinancialImpact(
    req.params.injuryId,
    req.user!.id,
  );
  Promise.all([
    invalidateMultiple([CachePrefix.INJURY_FINANCIALS, CachePrefix.INJURIES]),
    logAudit(
      "UPDATE",
      "injury_financials",
      record.id,
      buildAuditContext(req.user!, req.ip),
      `Financial impact computed for injury ${req.params.injuryId}`,
    ),
  ]).catch(() => {});
  sendSuccess(res, record);
}
