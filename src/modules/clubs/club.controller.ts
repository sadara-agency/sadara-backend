import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import { AppError } from "@middleware/errorHandler";
import * as clubService from "@modules/clubs/club.service";

const crud = createCrudController({
  service: {
    list: (query) => clubService.listClubs(query),
    getById: (id) => clubService.getClubById(id),
    create: (body) => clubService.createClub(body),
    update: (id, body) => clubService.updateClub(id, body),
    delete: (id) => clubService.deleteClub(id),
  },
  entity: "clubs",
  cachePrefixes: [],
  label: (c) => c.name,
});

export const { list, getById, create, update, remove } = crud;

// ── Bulk Delete ──

export async function bulkRemove(req: AuthRequest, res: Response) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError("ids must be a non-empty array", 400);
  }
  if (ids.length > 100) {
    throw new AppError("Cannot delete more than 100 clubs at once", 400);
  }
  const result = await clubService.deleteClubs(ids);
  await logAudit(
    "DELETE",
    "clubs",
    null,
    buildAuditContext(req.user!, req.ip),
    `Bulk deleted ${result.count} clubs`,
  );
  sendSuccess(res, result, `${result.count} clubs deleted`);
}

// ── Upload Club Logo ──

export async function uploadLogo(req: AuthRequest, res: Response) {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const logoUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

  const club = await clubService.updateClubLogo(req.params.id, logoUrl);
  await logAudit(
    "UPDATE",
    "clubs",
    club.id,
    buildAuditContext(req.user!, req.ip),
    "Updated club logo",
  );
  sendSuccess(res, { logoUrl }, "Logo uploaded");
}

// ── Contact CRUD ──

export async function createContact(req: AuthRequest, res: Response) {
  const contact = await clubService.createContact(req.params.id, req.body);
  await logAudit(
    "CREATE",
    "contacts",
    contact.id,
    buildAuditContext(req.user!, req.ip),
    `Created contact: ${contact.name} for club ${req.params.id}`,
  );
  sendCreated(res, contact);
}

export async function updateContact(req: AuthRequest, res: Response) {
  const contact = await clubService.updateContact(
    req.params.contactId,
    req.params.id,
    req.body,
  );
  await logAudit(
    "UPDATE",
    "contacts",
    req.params.contactId,
    buildAuditContext(req.user!, req.ip),
    `Updated contact for club ${req.params.id}`,
  );
  sendSuccess(res, contact, "Contact updated");
}

export async function deleteContact(req: AuthRequest, res: Response) {
  const result = await clubService.deleteContact(
    req.params.contactId,
    req.params.id,
  );
  await logAudit(
    "DELETE",
    "contacts",
    result.id,
    buildAuditContext(req.user!, req.ip),
    `Deleted contact from club ${req.params.id}`,
  );
  sendSuccess(res, result, "Contact deleted");
}
