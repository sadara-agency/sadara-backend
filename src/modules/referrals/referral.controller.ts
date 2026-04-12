import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import * as referralService from "@modules/referrals/referral.service";

// list / getById / update / remove are custom because they need req.user
// for row-level scoping via buildRowScope. Create goes through the factory
// for its audit + cache-invalidation wiring.

const crud = createCrudController({
  service: {
    list: (query) => referralService.listReferrals(query),
    getById: (id) => referralService.getReferralById(id),
    create: (body, userId) => referralService.createReferral(body, userId),
    update: (id, body) => referralService.updateReferral(id, body),
    delete: (id) => referralService.deleteReferral(id),
  },
  entity: "referrals",
  cachePrefixes: [],
  label: (r) => `${r.referralType} referral for player ${r.playerId}`,
});

export async function list(req: AuthRequest, res: Response) {
  const result = await referralService.listReferrals(req.query, req.user);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const referral = await referralService.getReferralById(
    req.params.id,
    req.user,
  );
  sendSuccess(res, referral);
}

export const { create } = crud;

export async function checkDuplicate(req: AuthRequest, res: Response) {
  const result = await referralService.checkDuplicate(
    req.query.playerId as string,
    req.query.referralType as string,
  );
  sendSuccess(res, result);
}

export async function update(req: AuthRequest, res: Response) {
  const referral = await referralService.updateReferral(
    req.params.id,
    req.body,
    req.user,
  );

  await logAudit(
    "UPDATE",
    "referrals",
    referral!.id,
    buildAuditContext(req.user!, req.ip),
    `Updated referral ${referral!.id}`,
  );

  sendSuccess(res, referral, "Referral updated");
}

export async function updateStatus(req: AuthRequest, res: Response) {
  const referral = await referralService.updateReferralStatus(
    req.params.id,
    req.body,
    req.user,
  );

  await logAudit(
    "UPDATE",
    "referrals",
    referral!.id,
    buildAuditContext(req.user!, req.ip),
    `Referral status changed to ${referral!.status}`,
  );

  sendSuccess(res, referral, `Status updated to ${referral!.status}`);
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await referralService.deleteReferral(req.params.id, req.user);

  await logAudit(
    "DELETE",
    "referrals",
    result.id,
    buildAuditContext(req.user!, req.ip),
    "Referral deleted",
  );

  sendSuccess(res, result, "Referral deleted");
}

// ── MANAGER OVERSIGHT ──

export async function getManagerDashboard(req: AuthRequest, res: Response) {
  const dashboard = await referralService.getManagerDashboard();
  sendSuccess(res, dashboard);
}

export async function getReferralsBySpecialist(
  req: AuthRequest,
  res: Response,
) {
  const result = await referralService.getReferralsBySpecialist(req.query);
  sendSuccess(res, result);
}

export async function getOverdueReferrals(req: AuthRequest, res: Response) {
  const result = await referralService.getOverdueReferrals(req.query);
  sendSuccess(res, result);
}

export async function getSpecialistPerformance(
  req: AuthRequest,
  res: Response,
) {
  const result = await referralService.getSpecialistPerformance(req.query);
  sendSuccess(res, result);
}

export async function escalateReferral(req: AuthRequest, res: Response) {
  const referral = await referralService.escalateReferral(
    req.params.id,
    req.body,
    req.user!.id,
  );
  sendSuccess(res, referral, "Referral escalated");
}
