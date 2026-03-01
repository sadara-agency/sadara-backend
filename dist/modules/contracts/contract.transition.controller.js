"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionContract = transitionContract;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const errorHandler_1 = require("../../middleware/errorHandler");
const contract_model_1 = require("./contract.model");
// ── Allowed transitions map ──
const TRANSITION_MAP = {
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
async function transitionContract(req, res) {
    const { id } = req.params;
    const { action, signatureData, signedDocumentUrl, notes } = req.body;
    const contract = await contract_model_1.Contract.findByPk(id);
    if (!contract)
        throw new errorHandler_1.AppError('Contract not found', 404);
    const currentStatus = contract.status;
    const allowedActions = TRANSITION_MAP[currentStatus];
    if (!allowedActions) {
        throw new errorHandler_1.AppError(`Contract in status '${currentStatus}' cannot be transitioned`, 400);
    }
    const nextStatus = allowedActions[action];
    if (!nextStatus) {
        throw new errorHandler_1.AppError(`Action '${action}' is not valid for status '${currentStatus}'. Allowed: ${Object.keys(allowedActions).join(', ')}`, 400);
    }
    // Build update payload
    const updatePayload = {
        status: nextStatus,
    };
    // Handle signing actions
    if (action === 'sign_digital') {
        if (!signatureData) {
            throw new errorHandler_1.AppError('signatureData is required for digital signing', 400);
        }
        updatePayload.signedDocumentUrl = signatureData; // base64 image
        updatePayload.signedAt = new Date();
        updatePayload.signingMethod = 'digital';
    }
    if (action === 'sign_upload') {
        if (!signedDocumentUrl) {
            throw new errorHandler_1.AppError('signedDocumentUrl is required for upload signing', 400);
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
    await (0, audit_1.logAudit)('UPDATE', 'contracts', id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Contract transitioned: ${currentStatus} → ${nextStatus} (action: ${action})`);
    (0, apiResponse_1.sendSuccess)(res, contract, `Contract transitioned to ${nextStatus}`);
}
//# sourceMappingURL=contract.transition.controller.js.map