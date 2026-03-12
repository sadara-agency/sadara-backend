import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "../../shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "../../shared/utils/audit";
import { createCrudController } from "../../shared/utils/crudController";
import { AppError } from "../../middleware/errorHandler";
import * as svc from "./document.service";

// Documents list takes req.user?.role for RBAC, so we override list.
// Upload is custom (multipart/form-data).

const crud = createCrudController({
  service: {
    list: (query) => svc.listDocuments(query),
    getById: (id) => svc.getDocumentById(id),
    create: (body, userId) => svc.createDocument(body, userId),
    update: (id, body) => svc.updateDocument(id, body),
    delete: (id) => svc.deleteDocument(id),
  },
  entity: "documents",
  cachePrefixes: [],
  label: (d) => d.name,
});

// Override list to pass user role for RBAC filtering
export async function list(req: AuthRequest, res: Response) {
  const r = await svc.listDocuments(req.query, req.user?.role);
  sendPaginated(res, r.data, r.meta);
}

export const { getById, create, update, remove } = crud;

// ── Upload (multipart/form-data — real file) ──

export async function upload(req: AuthRequest, res: Response) {
  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }

  const file = req.file;
  const body = req.body;

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const fileUrl = `${baseUrl}/uploads/documents/${file.filename}`;

  const input = {
    name: body.name || file.originalname,
    type: body.type || "Other",
    status: body.status || "Active",
    fileUrl,
    fileSize: file.size,
    mimeType: file.mimetype,
    entityType: body.entityType || null,
    entityId: body.entityId || null,
    issueDate: body.issueDate || null,
    expiryDate: body.expiryDate || null,
    tags: body.tags
      ? typeof body.tags === "string"
        ? JSON.parse(body.tags)
        : body.tags
      : [],
    notes: body.notes || null,
  };

  const doc = await svc.createDocument(input, req.user!.id);

  await logAudit(
    "CREATE",
    "documents",
    doc!.id,
    buildAuditContext(req.user!, req.ip),
    `Uploaded: ${doc!.name} (${file.originalname}, ${(file.size / 1024).toFixed(0)} KB)`,
  );

  sendCreated(res, doc);
}
