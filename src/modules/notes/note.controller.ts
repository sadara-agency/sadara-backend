import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "../../shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "../../shared/utils/audit";
import * as svc from "./note.service";

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listNotes(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function create(req: AuthRequest, res: Response) {
  const note = await svc.createNote(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "notes",
    note.id,
    buildAuditContext(req.user!, req.ip),
    `Note added on ${req.body.ownerType} ${req.body.ownerId}`,
  );
  sendCreated(res, note);
}

export async function update(req: AuthRequest, res: Response) {
  const note = await svc.updateNote(
    req.params.id,
    req.body.content,
    req.user!.id,
  );
  await logAudit(
    "UPDATE",
    "notes",
    note.id,
    buildAuditContext(req.user!, req.ip),
    "Note updated",
  );
  sendSuccess(res, note, "Note updated");
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deleteNote(
    req.params.id,
    req.user!.id,
    req.user!.role,
  );
  await logAudit(
    "DELETE",
    "notes",
    result.id,
    buildAuditContext(req.user!, req.ip),
    "Note deleted",
  );
  sendSuccess(res, result, "Note deleted");
}
