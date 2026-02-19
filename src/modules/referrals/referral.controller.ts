import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as referralService from './referral.service';

// ── List ──

export async function list(req: AuthRequest, res: Response) {
    const result = await referralService.listReferrals(req.query, req.user!.id, req.user!.role);
    sendPaginated(res, result.data, result.meta);
}

// ── Get by ID ──

export async function getById(req: AuthRequest, res: Response) {
    const referral = await referralService.getReferralById(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, referral);
}

// ── Create ──

export async function create(req: AuthRequest, res: Response) {
    const referral = await referralService.createReferral(req.body, req.user!.id);

    await logAudit(
        'CREATE',
        'referrals',
        referral!.id,
        buildAuditContext(req.user!, req.ip),
        `Created ${referral!.referralType} referral for player ${referral!.playerId}`
    );

    sendCreated(res, referral);
}

// ── Update ──

export async function update(req: AuthRequest, res: Response) {
    const referral = await referralService.updateReferral(req.params.id, req.body, req.user!.id, req.user!.role);

    await logAudit(
        'UPDATE',
        'referrals',
        referral.id,
        buildAuditContext(req.user!, req.ip),
        `Updated referral ${referral.id}`
    );

    sendSuccess(res, referral, 'Referral updated');
}

// ── Update Status ──

export async function updateStatus(req: AuthRequest, res: Response) {
    const referral = await referralService.updateReferralStatus(req.params.id, req.body, req.user!.id, req.user!.role);

    await logAudit(
        'UPDATE',
        'referrals',
        referral.id,
        buildAuditContext(req.user!, req.ip),
        `Referral status changed to ${referral.status}`
    );

    sendSuccess(res, referral, `Status updated to ${referral.status}`);
}

// ── Delete ──

export async function remove(req: AuthRequest, res: Response) {
    const result = await referralService.deleteReferral(req.params.id, req.user!.id, req.user!.role);

    await logAudit(
        'DELETE',
        'referrals',
        result.id,
        buildAuditContext(req.user!, req.ip),
        'Referral deleted'
    );

    sendSuccess(res, result, 'Referral deleted');
}