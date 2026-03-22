import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import { AppError } from "@middleware/errorHandler";
import { uploadFile } from "@shared/utils/storage";
import * as svc from "@modules/documents/document.service";

// Documents list takes req.user?.role for RBAC, so we override list.
// Upload is custom (multipart/form-data).

const crud = createCrudController({
  service: {
    list: (query, user) => svc.listDocuments(query, user?.role, user),
    getById: (id, user) => svc.getDocumentById(id, user),
    create: (body, userId) => svc.createDocument(body, userId),
    update: (id, body) => svc.updateDocument(id, body),
    delete: (id) => svc.deleteDocument(id),
  },
  entity: "documents",
  cachePrefixes: [],
  label: (d) => d.name,
});

// Override list to pass user role for RBAC filtering + row-level scoping
export async function list(req: AuthRequest, res: Response) {
  const r = await svc.listDocuments(req.query, req.user?.role, req.user);
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

  // Process + upload to GCS (or local fallback)
  const result = await uploadFile({
    folder: "documents",
    originalName: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
    generateThumbnail: file.mimetype.startsWith("image/"),
  });

  // For GCS: url is the full public URL
  // For local: url is relative, so prefix with the server origin
  const fileUrl = result.url.startsWith("http")
    ? result.url
    : `${req.protocol}://${req.get("host")}${result.url}`;

  const input = {
    name: body.name || file.originalname,
    type: body.type || "Other",
    status: body.status || "Active",
    fileUrl,
    fileSize: result.size,
    mimeType: result.mimeType,
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
    `Uploaded: ${doc!.name} (${file.originalname}, ${(result.size / 1024).toFixed(0)} KB)`,
  );

  sendCreated(res, doc);
}
