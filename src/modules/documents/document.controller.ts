import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import { AppError } from '../../middleware/errorHandler';
import * as svc from './document.service';

// ── List ──

export async function list(req: AuthRequest, res: Response) {
  const r = await svc.listDocuments(req.query);
  sendPaginated(res, r.data, r.meta);
}

// ── Get by ID ──

export async function getById(req: AuthRequest, res: Response) {
  sendSuccess(res, await svc.getDocumentById(req.params.id));
}

// ── Upload (multipart/form-data — real file) ──

export async function upload(req: AuthRequest, res: Response) {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const file = req.file;
  const body = req.body;

  // Build the public URL for the file
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${baseUrl}/uploads/documents/${file.filename}`;

  const input = {
    name: body.name || file.originalname,
    type: body.type || 'Other',
    status: body.status || 'Active',
    fileUrl,
    fileSize: file.size,
    mimeType: file.mimetype,
    playerId: body.playerId || null,
    contractId: body.contractId || null,
    issueDate: body.issueDate || null,
    expiryDate: body.expiryDate || null,
    tags: body.tags ? (typeof body.tags === 'string' ? JSON.parse(body.tags) : body.tags) : [],
    notes: body.notes || null,
  };

  const doc = await svc.createDocument(input, req.user!.id);

  await logAudit(
    'CREATE', 'documents', doc!.id,
    buildAuditContext(req.user!, req.ip),
    `Uploaded: ${doc!.name} (${file.originalname}, ${(file.size / 1024).toFixed(0)} KB)`
  );

  sendCreated(res, doc);
}

// ── Create (JSON — for records without file e.g. external URL) ──

export async function create(req: AuthRequest, res: Response) {
  const doc = await svc.createDocument(req.body, req.user!.id);

  await logAudit(
    'CREATE', 'documents', doc!.id,
    buildAuditContext(req.user!, req.ip),
    `Created: ${doc!.name}`
  );

  sendCreated(res, doc);
}

// ── Update ──

export async function update(req: AuthRequest, res: Response) {
  const doc = await svc.updateDocument(req.params.id, req.body);

  await logAudit(
    'UPDATE', 'documents', doc!.id,
    buildAuditContext(req.user!, req.ip),
    `Updated: ${doc!.name}`
  );

  sendSuccess(res, doc, 'Document updated');
}

// ── Delete ──

export async function remove(req: AuthRequest, res: Response) {
  const r = await svc.deleteDocument(req.params.id);

  await logAudit(
    'DELETE', 'documents', r.id,
    buildAuditContext(req.user!, req.ip),
    'Document deleted'
  );

  sendSuccess(res, r, 'Document deleted');
}