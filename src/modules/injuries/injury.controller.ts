import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { sendSuccess, sendCreated } from "../../shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "../../shared/utils/audit";
import { createCrudController } from "../../shared/utils/crudController";
import * as svc from "./injury.service";

const crud = createCrudController({
  service: {
    list: (query) => svc.listInjuries(query),
    getById: (id) => svc.getInjuryById(id),
    create: (body, userId) => svc.createInjury(body, userId),
    update: (id, body) => svc.updateInjury(id, body),
    delete: (id) => svc.deleteInjury(id),
  },
  entity: "injuries",
  cachePrefixes: [],
  label: (i) => `${i.injuryType} for player ${i.playerId}`,
});

export const { list, getById, create, update, remove } = crud;

// ── Custom handlers ──

export async function getByPlayer(req: AuthRequest, res: Response) {
  const injuries = await svc.getPlayerInjuries(req.params.playerId);
  sendSuccess(res, injuries);
}

export async function addUpdate(req: AuthRequest, res: Response) {
  const result = await svc.addInjuryUpdate(
    req.params.id,
    req.body,
    req.user!.id,
  );
  await logAudit(
    "UPDATE",
    "injuries",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Added progress update to injury ${req.params.id}`,
  );
  sendCreated(res, result);
}

export async function stats(req: AuthRequest, res: Response) {
  const data = await svc.getInjuryStats();
  sendSuccess(res, data);
}
