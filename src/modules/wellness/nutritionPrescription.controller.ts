import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import * as svc from "./nutritionPrescription.service";

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listPrescriptions(req.query as any, req.user);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const prescription = await svc.getPrescriptionById(req.params.id, req.user);
  sendSuccess(res, prescription);
}

export async function create(req: AuthRequest, res: Response) {
  const prescription = await svc.issuePrescription(req.body, req.user!.id);
  sendCreated(res, prescription);
  logAudit(
    "CREATE",
    "wellness",
    prescription.id,
    buildAuditContext(req.user!, req.ip),
    `Issued prescription v1 for player ${prescription.playerId}`,
  ).catch(() => {});
}

export async function update(req: AuthRequest, res: Response) {
  const prescription = await svc.updatePrescription(req.params.id, req.body);
  sendSuccess(res, prescription, "Prescription updated");
  logAudit(
    "UPDATE",
    "wellness",
    prescription.id,
    buildAuditContext(req.user!, req.ip),
    `Updated prescription ${req.params.id}`,
  ).catch(() => {});
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deletePrescription(req.params.id);
  sendSuccess(res, result, "Prescription deleted");
  logAudit(
    "DELETE",
    "wellness",
    result.id,
    buildAuditContext(req.user!, req.ip),
    `Deleted prescription ${result.id}`,
  ).catch(() => {});
}

export async function getCurrent(req: AuthRequest, res: Response) {
  const prescription = await svc.getCurrentPrescription(
    req.params.playerId,
    req.user,
  );
  sendSuccess(res, prescription);
}

export async function getHistory(req: AuthRequest, res: Response) {
  const history = await svc.getVersionHistory(req.params.playerId, req.user);
  sendSuccess(res, history);
}

export async function reissue(req: AuthRequest, res: Response) {
  const prescription = await svc.issueNewVersion(
    req.params.playerId,
    req.body.triggeringReason ?? "manual",
    req.body.triggeringScanId,
    req.user!.id,
  );
  if (!prescription) {
    sendSuccess(res, null, "No current prescription to reissue");
    return;
  }
  sendCreated(res, prescription, "New prescription version issued");
  logAudit(
    "CREATE",
    "wellness",
    prescription.id,
    buildAuditContext(req.user!, req.ip),
    `Reissued prescription v${prescription.versionNumber} for player ${req.params.playerId} (reason: ${prescription.triggeringReason})`,
  ).catch(() => {});
}
