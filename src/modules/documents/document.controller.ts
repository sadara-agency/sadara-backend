import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as svc from './document.service';

export async function list(req: AuthRequest, res: Response) { const r = await svc.listDocuments(req.query); sendPaginated(res, r.data, r.meta); }
export async function getById(req: AuthRequest, res: Response) { sendSuccess(res, await svc.getDocumentById(req.params.id)); }

export async function create(req: AuthRequest, res: Response) {
  const doc = await svc.createDocument(req.body, req.user!.id);
  await logAudit('CREATE', 'documents', doc.id, buildAuditContext(req.user!, req.ip), `Uploaded: ${doc.name}`);
  sendCreated(res, doc);
}

export async function update(req: AuthRequest, res: Response) {
  const doc = await svc.updateDocument(req.params.id, req.body);
  await logAudit('UPDATE', 'documents', doc.id, buildAuditContext(req.user!, req.ip), `Updated: ${doc.name}`);
  sendSuccess(res, doc, 'Document updated');
}

export async function remove(req: AuthRequest, res: Response) {
  const r = await svc.deleteDocument(req.params.id);
  await logAudit('DELETE', 'documents', r.id, buildAuditContext(req.user!, req.ip), 'Document deleted');
  sendSuccess(res, r, 'Document deleted');
}