import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import * as svc from "@modules/notes/note.service";

// Notes has non-standard service signatures (role-aware list, userId on
// update/delete), so we only reuse create from the factory and keep
// list/update/remove as custom handlers.

const crud = createCrudController({
  service: {
    list: (query) => svc.listNotes(query),
    getById: (id) => Promise.resolve({ id }),
    create: (body, userId) => svc.createNote(body, userId),
    update: (id, body) => svc.updateNote(id, body.content, body.userId),
    delete: (id) => svc.deleteNote(id, "", ""),
  },
  entity: "notes",
  cachePrefixes: [],
  label: (n) => `on ${n.ownerType} ${n.ownerId}`,
});

// Override list to pass user role for RBAC filtering
export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listNotes(req.query, req.user?.role);
  sendPaginated(res, result.data, result.meta);
}

export const { create } = crud;

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
