// ─────────────────────────────────────────────────────────────
// src/modules/clearances/clearance.controller.ts
// Route handlers for clearance (مخالصة) endpoints.
// ─────────────────────────────────────────────────────────────
import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import * as clearanceService from './clearance.service';
import { sendSuccess, sendPaginated, sendCreated } from '../../shared/utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';

// GET /api/v1/clearances
export async function list(req: AuthRequest, res: Response) {
  const result = await clearanceService.listClearances(req.query);
  return sendPaginated(res, result.clearances, {
    page: result.page,
    limit: Number(req.query?.limit) || 20,
    total: result.total,
    totalPages: result.totalPages,
  });
}

// GET /api/v1/clearances/:id
export async function getById(req: AuthRequest, res: Response) {
  const clearance = await clearanceService.getClearanceById(req.params.id);
  if (!clearance) throw new AppError('Clearance not found', 404);
  return sendSuccess(res, clearance);
}

// POST /api/v1/clearances
export async function create(req: AuthRequest, res: Response) {
  const clearance = await clearanceService.createClearance(req.body, req.user!.id);
  return sendCreated(res, clearance, 'Clearance created successfully');
}

// PUT /api/v1/clearances/:id
export async function update(req: AuthRequest, res: Response) {
  const clearance = await clearanceService.updateClearance(req.params.id, req.body);
  return sendSuccess(res, clearance, 'Clearance updated successfully');
}

// POST /api/v1/clearances/:id/complete
export async function complete(req: AuthRequest, res: Response) {
  const clearance = await clearanceService.completeClearance(req.params.id, req.body);
  return sendSuccess(res, clearance, 'Clearance completed successfully');
}

// DELETE /api/v1/clearances/:id
export async function remove(req: AuthRequest, res: Response) {
  await clearanceService.deleteClearance(req.params.id);
  return sendSuccess(res, null, 'Clearance deleted successfully');
}

// GET /api/v1/contracts/:contractId/clearances
export async function getByContract(req: AuthRequest, res: Response) {
  const clearances = await clearanceService.getClearancesByContract(req.params.contractId);
  return sendSuccess(res, clearances);
}