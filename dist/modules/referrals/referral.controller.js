"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.updateStatus = updateStatus;
exports.remove = remove;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const referralService = __importStar(require("./referral.service"));
// ── List ──
async function list(req, res) {
    const result = await referralService.listReferrals(req.query, req.user.id, req.user.role);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
// ── Get by ID ──
async function getById(req, res) {
    const referral = await referralService.getReferralById(req.params.id, req.user.id, req.user.role);
    (0, apiResponse_1.sendSuccess)(res, referral);
}
// ── Create ──
async function create(req, res) {
    const referral = await referralService.createReferral(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'referrals', referral.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Created ${referral.referralType} referral for player ${referral.playerId}`);
    (0, apiResponse_1.sendCreated)(res, referral);
}
// ── Update ──
async function update(req, res) {
    const referral = await referralService.updateReferral(req.params.id, req.body, req.user.id, req.user.role);
    await (0, audit_1.logAudit)('UPDATE', 'referrals', referral.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated referral ${referral.id}`);
    (0, apiResponse_1.sendSuccess)(res, referral, 'Referral updated');
}
// ── Update Status ──
async function updateStatus(req, res) {
    const referral = await referralService.updateReferralStatus(req.params.id, req.body, req.user.id, req.user.role);
    await (0, audit_1.logAudit)('UPDATE', 'referrals', referral.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Referral status changed to ${referral.status}`);
    (0, apiResponse_1.sendSuccess)(res, referral, `Status updated to ${referral.status}`);
}
// ── Delete ──
async function remove(req, res) {
    const result = await referralService.deleteReferral(req.params.id, req.user.id, req.user.role);
    await (0, audit_1.logAudit)('DELETE', 'referrals', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Referral deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Referral deleted');
}
//# sourceMappingURL=referral.controller.js.map