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
import {
  uploadFile,
  resolveFileUrl,
  streamFileBuffer,
  isPrivateKey,
} from "@shared/utils/storage";
import * as svc from "@modules/documents/document.service";
import type { DocumentQuery } from "@modules/documents/document.validation";

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
// req.query validated by documentQuerySchema middleware before reaching here
export async function list(req: AuthRequest, res: Response) {
  const r = await svc.listDocuments(
    req.query as unknown as DocumentQuery,
    req.user?.role,
    req.user,
  );
  sendPaginated(res, r.data, r.meta);
}

// Override create/update to forward full req.user so validateEntity can
// check the caller's read permission on the linked module (A-C2)
export async function create(req: AuthRequest, res: Response) {
  const doc = await svc.createDocument(req.body, req.user!.id, req.user);
  sendCreated(res, doc);
}

export async function update(req: AuthRequest, res: Response) {
  const doc = await svc.updateDocument(req.params.id, req.body, req.user);
  sendSuccess(res, doc, "Document updated");
}

export const { getById, remove } = crud;

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

  // Documents are private — result.url is a GCS key (e.g. "documents/uuid.pdf")
  // or a local relative path (e.g. "/uploads/documents/uuid.pdf").
  // We store it as-is; the /download endpoint resolves it to a signed URL.
  const fileUrl = result.url;

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
    tags: (() => {
      if (!body.tags) return [];
      if (typeof body.tags !== "string") return body.tags;
      try {
        return JSON.parse(body.tags);
      } catch {
        throw new AppError("Invalid tags format — must be a JSON array", 400);
      }
    })(),
    notes: body.notes || null,
  };

  const doc = await svc.createDocument(input, req.user!.id, req.user);

  await logAudit(
    "CREATE",
    "documents",
    doc!.id,
    buildAuditContext(req.user!, req.ip),
    `Uploaded: ${doc!.name} (${file.originalname}, ${(result.size / 1024).toFixed(0)} KB)`,
  );

  sendCreated(res, doc);
}

// ── Download (serve local files or redirect to signed URL) ──

export async function download(req: AuthRequest, res: Response) {
  const doc = await svc.getDocumentById(req.params.id, req.user);
  if (!doc?.fileUrl) {
    throw new AppError("Document file not available", 404);
  }

  const url = await resolveFileUrl(doc.fileUrl, 15); // 15 min expiry

  // Local files: serve directly (avoids redirect issues with iframes/embeds)
  if (url.startsWith("/uploads/")) {
    const path = await import("path");
    const fs = await import("fs");
    const filePath = path.resolve(url.slice(1)); // strip leading /
    if (!fs.existsSync(filePath)) {
      throw new AppError("File not found on disk", 404);
    }
    return res.sendFile(filePath);
  }

  // Remote URLs (GCS signed URLs etc.): redirect
  res.redirect(url);
}

// ── Preview (serve file for inline viewing) ──
export async function preview(req: AuthRequest, res: Response) {
  const doc = await svc.getDocumentById(req.params.id, req.user);
  if (!doc?.fileUrl) {
    throw new AppError("Document file not available", 404);
  }

  const mimeType = doc.mimeType || "application/octet-stream";
  const disposition = `inline; filename="${encodeURIComponent(doc.name)}"`;

  // Private GCS key — stream directly using service-account credentials
  // (avoids signed-URL generation which requires iam.serviceAccounts.signBlob)
  if (isPrivateKey(doc.fileUrl)) {
    const buffer = await streamFileBuffer(doc.fileUrl);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", disposition);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buffer);
  } else if (doc.fileUrl.startsWith("/uploads/")) {
    // Local /uploads/ path
    const pathMod = await import("path");
    const fs = await import("fs");
    const filePath = pathMod.resolve(doc.fileUrl.slice(1));
    if (!fs.existsSync(filePath)) {
      throw new AppError("File not found on disk", 404);
    }
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", disposition);
    res.sendFile(filePath);
  } else {
    // Public URL (e.g. storage.googleapis.com) — redirect to the public URL
    const url = await resolveFileUrl(doc.fileUrl, 15);
    res.redirect(url);
  }
}
