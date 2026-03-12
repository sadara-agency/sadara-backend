import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { sendSuccess, sendPaginated } from "../../shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "../../shared/utils/audit";
import { createCrudController } from "../../shared/utils/crudController";
import * as referralService from "./referral.service";

// Referrals pass userId/role to most service methods, so we adapt via
// the service wrapper. list and getById need custom handlers since they
// require req.user context beyond what the factory provides.

const crud = createCrudController({
  service: {
    list: (query) => referralService.listReferrals(query, "", ""),
    getById: (id) => referralService.getReferralById(id, "", ""),
    create: (body, userId) => referralService.createReferral(body, userId),
    update: (id, body) => referralService.updateReferral(id, body, "", ""),
    delete: (id) => referralService.deleteReferral(id, "", ""),
  },
  entity: "referrals",
  cachePrefixes: [],
  label: (r) => `${r.referralType} referral for player ${r.playerId}`,
});

// Override list/getById to pass user context
export async function list(req: AuthRequest, res: Response) {
  const result = await referralService.listReferrals(
    req.query,
    req.user!.id,
    req.user!.role,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const referral = await referralService.getReferralById(
    req.params.id,
    req.user!.id,
    req.user!.role,
  );
  sendSuccess(res, referral);
}

export const { create } = crud;

// Override update/remove to pass user context
export async function update(req: AuthRequest, res: Response) {
  const referral = await referralService.updateReferral(
    req.params.id,
    req.body,
    req.user!.id,
    req.user!.role,
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
    req.user!.id,
    req.user!.role,
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
  const result = await referralService.deleteReferral(
    req.params.id,
    req.user!.id,
    req.user!.role,
  );

  await logAudit(
    "DELETE",
    "referrals",
    result.id,
    buildAuditContext(req.user!, req.ip),
    "Referral deleted",
  );

  sendSuccess(res, result, "Referral deleted");
}
