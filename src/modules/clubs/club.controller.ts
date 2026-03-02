import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as clubService from './club.service';

export async function list(req: AuthRequest, res: Response) {
  const result = await clubService.listClubs(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const club = await clubService.getClubById(req.params.id);
  sendSuccess(res, club);
}

export async function create(req: AuthRequest, res: Response) {
  const club = await clubService.createClub(req.body);
  await logAudit('CREATE', 'clubs', club.id, buildAuditContext(req.user!, req.ip), `Created club: ${club.name}`);
  sendCreated(res, club);
}

export async function update(req: AuthRequest, res: Response) {
  const club = await clubService.updateClub(req.params.id, req.body);
  await logAudit('UPDATE', 'clubs', club.id, buildAuditContext(req.user!, req.ip), `Updated club: ${club.name}`);
  sendSuccess(res, club, 'Club updated');
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await clubService.deleteClub(req.params.id);
  await logAudit('DELETE', 'clubs', result.id, buildAuditContext(req.user!, req.ip), 'Club deleted');
  sendSuccess(res, result, 'Club deleted');
}

// ── Upload Club Logo ──

export async function uploadLogo(req: AuthRequest, res: Response) {
  if (!req.file) throw new AppError('No file uploaded', 400);

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const logoUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

  const club = await clubService.updateClubLogo(req.params.id, logoUrl);
  await logAudit('UPDATE', 'clubs', club.id, buildAuditContext(req.user!, req.ip), 'Updated club logo');
  sendSuccess(res, { logoUrl }, 'Logo uploaded');
}

// ── Contact CRUD ──

export async function createContact(req: AuthRequest, res: Response) {
  const contact = await clubService.createContact(req.params.id, req.body);
  await logAudit('CREATE', 'contacts', contact.id, buildAuditContext(req.user!, req.ip),
    `Created contact: ${contact.name} for club ${req.params.id}`);
  sendCreated(res, contact);
}

export async function updateContact(req: AuthRequest, res: Response) {
  const contact = await clubService.updateContact(req.params.contactId, req.params.id, req.body);
  await logAudit('UPDATE', 'contacts', req.params.contactId, buildAuditContext(req.user!, req.ip),
    `Updated contact for club ${req.params.id}`);
  sendSuccess(res, contact, 'Contact updated');
}

export async function deleteContact(req: AuthRequest, res: Response) {
  const result = await clubService.deleteContact(req.params.contactId, req.params.id);
  await logAudit('DELETE', 'contacts', result.id, buildAuditContext(req.user!, req.ip),
    `Deleted contact from club ${req.params.id}`);
  sendSuccess(res, result, 'Contact deleted');
}
