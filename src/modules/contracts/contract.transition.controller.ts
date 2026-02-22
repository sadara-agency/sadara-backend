// ─────────────────────────────────────────────────────────────
// src/modules/contracts/contract.transition.controller.ts
// POST /api/v1/contracts/:id/transition
//
// Handles contract status workflow:
//   Draft → Review → Signing → Active
// ─────────────────────────────────────────────────────────────
import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import { AppError } from '../../middleware/errorHandler';
import { Contract } from './contract.model';
import * as contractService from './contract.service';

// Valid status transitions
const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
    submit_review: { from: ['Draft'], to: 'Review' },
    approve: { from: ['Review'], to: 'Signing' },
    reject_to_draft: { from: ['Review'], to: 'Draft' },
    sign_digital: { from: ['Signing'], to: 'Active' },
    sign_upload: { from: ['Signing'], to: 'Active' },
    return_review: { from: ['Signing'], to: 'Review' },
};

const ACTION_LABELS: Record<string, string> = {
    submit_review: 'ارسال للمراجعة',
    approve: 'الموافقة وإرسال للتوقيع',
    reject_to_draft: 'إرجاع للمسودة',
    sign_digital: 'توقيع رقمي',
    sign_upload: 'رفع عقد موقع',
    return_review: 'إرجاع للمراجعة',
};

export async function transitionStatus(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { action, signatureData, signedDocumentUrl, notes } = req.body;

    // 1. Get current contract
    const contract = await Contract.findByPk(id);
    if (!contract) {
        throw new AppError('Contract not found', 404);
    }

    // 2. Validate transition
    const transition = TRANSITIONS[action];
    if (!transition) {
        throw new AppError(`Invalid action: ${action}`, 400);
    }

    if (!transition.from.includes(contract.status)) {
        throw new AppError(
            `Cannot ${action} from status "${contract.status}". Expected: ${transition.from.join(' or ')}`,
            422,
        );
    }

    // 3. Build update data
    const updateData: Record<string, unknown> = {
        status: transition.to,
    };

    if (notes) {
        updateData.notes = notes;
    }

    // Handle signing actions
    if (action === 'sign_digital') {
        if (!signatureData) {
            throw new AppError('Signature data is required for digital signing', 400);
        }
        updateData.signingMethod = 'digital';
        updateData.signedAt = new Date();
        // Store signature data as base64 in signedDocumentUrl for now
        // In production, save to S3 and store URL
        updateData.signedDocumentUrl = signatureData;
    }

    if (action === 'sign_upload') {
        if (!signedDocumentUrl) {
            throw new AppError('Signed document URL is required', 400);
        }
        updateData.signingMethod = 'upload';
        updateData.signedAt = new Date();
        updateData.signedDocumentUrl = signedDocumentUrl;
    }

    // 4. Apply update
    await contract.update(updateData);

    // 5. Audit log
    await logAudit(
        'UPDATE',
        'contracts',
        id,
        buildAuditContext(req.user!, req.ip),
        `Contract transition: ${contract.status} → ${transition.to} (${ACTION_LABELS[action] || action})`,
    );

    // 6. Return enriched contract
    const enriched = await contractService.getContractById(id);
    sendSuccess(res, enriched, ACTION_LABELS[action] || 'Status updated');
}