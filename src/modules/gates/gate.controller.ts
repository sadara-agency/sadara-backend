import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as gateService from './gate.service';

// ── List Gates ──

export async function list(req: AuthRequest, res: Response) {
  const result = await gateService.listGates(req.query);
  sendPaginated(res, result.data, result.meta);
}

// ── Get Gate by ID ──

export async function getById(req: AuthRequest, res: Response) {
  const gate = await gateService.getGateById(req.params.id);
  sendSuccess(res, gate);
}

// ── Get Player Gates (pipeline view) ──

export async function getPlayerGates(req: AuthRequest, res: Response) {
  const result = await gateService.getPlayerGates(req.params.playerId);
  sendSuccess(res, result);
}

// ── Create Gate ──

export async function create(req: AuthRequest, res: Response) {
  const gate = await gateService.createGate(req.body);

  await logAudit(
    'CREATE',
    'gates',
    gate.id,
    buildAuditContext(req.user!, req.ip),
    `Created Gate ${gate.gateNumber} for player ${gate.playerId}`
  );

  sendCreated(res, gate);
}

// ── Initialize Gate (create + seed default checklist) ──

export async function initialize(req: AuthRequest, res: Response) {
  const gate = await gateService.initializeGate(
    req.body.playerId,
    req.body.gateNumber,
    {
      autoStart: req.body.autoStart ?? false,
      notes: req.body.notes,
    }
  );

  await logAudit(
    'CREATE',
    'gates',
    (gate as any).id,
    buildAuditContext(req.user!, req.ip),
    `Initialized Gate ${req.body.gateNumber} for player ${req.body.playerId} with default checklist`
  );

  sendCreated(res, gate);
}

// ── Advance Gate (start / complete) ──

export async function advance(req: AuthRequest, res: Response) {
  const gate = await gateService.advanceGate(
    req.params.id,
    req.body.action,
    req.user!.id,
    req.body.notes
  );

  await logAudit(
    'UPDATE',
    'gates',
    gate.id,
    buildAuditContext(req.user!, req.ip),
    `Gate ${gate.gateNumber} ${req.body.action === 'start' ? 'started' : 'completed'}`
  );

  sendSuccess(res, gate, `Gate ${req.body.action === 'start' ? 'started' : 'completed'}`);
}

// ── Update Gate ──

export async function update(req: AuthRequest, res: Response) {
  const gate = await gateService.updateGate(req.params.id, req.body);

  await logAudit(
    'UPDATE',
    'gates',
    gate.id,
    buildAuditContext(req.user!, req.ip),
    `Updated Gate ${gate.gateNumber}`
  );

  sendSuccess(res, gate, 'Gate updated');
}

// ── Delete Gate ──

export async function remove(req: AuthRequest, res: Response) {
  const result = await gateService.deleteGate(req.params.id);

  await logAudit(
    'DELETE',
    'gates',
    result.id,
    buildAuditContext(req.user!, req.ip),
    'Gate deleted'
  );

  sendSuccess(res, result, 'Gate deleted');
}

// ══════════════════════════════════════════
// CHECKLIST OPERATIONS
// ══════════════════════════════════════════

// ── Add Checklist Item ──

export async function addChecklistItem(req: AuthRequest, res: Response) {
  const item = await gateService.addChecklistItem(req.params.gateId, req.body);

  await logAudit(
    'CREATE',
    'gate_checklists',
    item.id,
    buildAuditContext(req.user!, req.ip),
    `Added checklist item to gate ${req.params.gateId}`
  );

  sendCreated(res, item);
}

// ── Toggle Checklist Item ──

export async function toggleChecklistItem(req: AuthRequest, res: Response) {
  const item = await gateService.toggleChecklistItem(
    req.params.itemId,
    req.body,
    req.user!.id
  );

  await logAudit(
    'UPDATE',
    'gate_checklists',
    item.id,
    buildAuditContext(req.user!, req.ip),
    `Checklist item ${item.isCompleted ? 'completed' : 'unchecked'}: ${item.item}`
  );

  sendSuccess(res, item, item.isCompleted ? 'Item completed' : 'Item unchecked');
}

// ── Delete Checklist Item ──

export async function deleteChecklistItem(req: AuthRequest, res: Response) {
  const result = await gateService.deleteChecklistItem(req.params.itemId);

  await logAudit(
    'DELETE',
    'gate_checklists',
    result.id,
    buildAuditContext(req.user!, req.ip),
    'Checklist item deleted'
  );

  sendSuccess(res, result, 'Checklist item deleted');
}