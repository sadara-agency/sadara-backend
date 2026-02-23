import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import { AppError } from '../../middleware/errorHandler';
import { Contract } from './contract.model';

// ── Allowed transitions map ──
const TRANSITION_MAP: Record<string, Record<string, string>> = {
  Draft: {
    submit_review: 'Review',
  },
  Review: {
    approve: 'Signing',
    reject_to_draft: 'Draft',
  },
  Signing: {
    sign_digital: 'Active',
    sign_upload: 'Active',
    return_review: 'Review',
  },
};

// ── Controller ──

export async function transitionContract(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { action, signatureData, signedDocumentUrl, notes } = req.body;

  const contract = await Contract.findByPk(id);
  if (!contract) throw new AppError('Contract not found', 404);

  const currentStatus = contract.status;
  const allowedActions = TRANSITION_MAP[currentStatus];

  if (!allowedActions) {
    throw new AppError(`Contract in status '${currentStatus}' cannot be transitioned`, 400);
  }

  const nextStatus = allowedActions[action];
  if (!nextStatus) {
    throw new AppError(
      `Action '${action}' is not valid for status '${currentStatus}'. Allowed: ${Object.keys(allowedActions).join(', ')}`,
      400,
    );
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
  };

  // Handle signing actions
  if (action === 'sign_digital') {
    if (!signatureData) {
      throw new AppError('signatureData is required for digital signing', 400);
    }
    updatePayload.signedDocumentUrl = signatureData; // base64 image
    updatePayload.signedAt = new Date();
    updatePayload.signingMethod = 'digital';
  }

  if (action === 'sign_upload') {
    if (!signedDocumentUrl) {
      throw new AppError('signedDocumentUrl is required for upload signing', 400);
    }
    updatePayload.signedDocumentUrl = signedDocumentUrl;
    updatePayload.signedAt = new Date();
    updatePayload.signingMethod = 'upload';
  }

  // Add notes if provided
  if (notes) {
    const existing = contract.notes || '';
    const timestamp = new Date().toISOString().split('T')[0];
    updatePayload.notes = existing
      ? `${existing}\n[${timestamp}] ${action}: ${notes}`
      : `[${timestamp}] ${action}: ${notes}`;
  }

  await contract.update(updatePayload);

  // Audit log
  await logAudit(
    'UPDATE',
    'contracts',
    id,
    buildAuditContext(req.user!, req.ip),
    `Contract transitioned: ${currentStatus} → ${nextStatus} (action: ${action})`,
  );

  sendSuccess(res, contract, `Contract transitioned to ${nextStatus}`);
}