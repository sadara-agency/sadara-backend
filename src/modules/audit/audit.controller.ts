import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendPaginated } from '../../shared/utils/apiResponse';
import * as auditService from './audit.service';

export async function list(req: AuthRequest, res: Response) {
  const result = await auditService.listAuditLogs(req.query);
  sendPaginated(res, result.data, result.meta);
}
