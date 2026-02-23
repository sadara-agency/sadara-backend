import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as contractService from './contract.service';

// ── List Contracts ──
export async function list(req: AuthRequest, res: Response) {
  const result = await contractService.listContracts(req.query);
  sendPaginated(res, result.data, result.meta);
}

// ── Get Contract by ID ──
export async function getById(req: AuthRequest, res: Response) {
  const contract = await contractService.getContractById(req.params.id);
  sendSuccess(res, contract);
}

// ── Create Contract ──
export async function create(req: AuthRequest, res: Response) {
  const contract = await contractService.createContract(req.body, req.user!.id);

  await logAudit(
    'CREATE',
    'contracts',
    contract.id,
    buildAuditContext(req.user!, req.ip),
    `Created contract: ${contract.title || 'Untitled'}`,
  );

  sendCreated(res, contract);
}

// ── Update Contract ──
export async function update(req: AuthRequest, res: Response) {
  const contract = await contractService.updateContract(req.params.id, req.body);

  await logAudit(
    'UPDATE',
    'contracts',
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Updated contract: ${contract.title || 'Untitled'}`,
  );

  sendSuccess(res, contract, 'Contract updated');
}

// ── Delete Contract ──
export async function remove(req: AuthRequest, res: Response) {
  const result = await contractService.deleteContract(req.params.id);

  await logAudit(
    'DELETE',
    'contracts',
    result.id,
    buildAuditContext(req.user!, req.ip),
    'Contract deleted',
  );

  sendSuccess(res, result, 'Contract deleted');
}