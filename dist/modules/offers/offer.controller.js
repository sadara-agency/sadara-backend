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
exports.getByPlayer = getByPlayer;
exports.create = create;
exports.update = update;
exports.updateStatus = updateStatus;
exports.remove = remove;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const offerService = __importStar(require("./offer.service"));
// ── List Offers ──
async function list(req, res) {
    const result = await offerService.listOffers(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
// ── Get Offer by ID ──
async function getById(req, res) {
    const offer = await offerService.getOfferById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, offer);
}
// ── Get Offers by Player ──
async function getByPlayer(req, res) {
    const offers = await offerService.getOffersByPlayer(req.params.playerId);
    (0, apiResponse_1.sendSuccess)(res, offers);
}
// ── Create Offer ──
async function create(req, res) {
    const offer = await offerService.createOffer(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'offers', offer.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Created ${offer.offerType} offer for player ${offer.playerId}`);
    (0, apiResponse_1.sendCreated)(res, offer);
}
// ── Update Offer ──
async function update(req, res) {
    const offer = await offerService.updateOffer(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'offers', offer.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated offer ${offer.id}`);
    (0, apiResponse_1.sendSuccess)(res, offer, 'Offer updated');
}
// ── Update Offer Status ──
async function updateStatus(req, res) {
    const offer = await offerService.updateOfferStatus(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'offers', offer.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Offer status changed to ${offer.status}`);
    (0, apiResponse_1.sendSuccess)(res, offer, `Offer status updated to ${offer.status}`);
}
// ── Delete Offer ──
async function remove(req, res) {
    const result = await offerService.deleteOffer(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'offers', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Offer deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Offer deleted');
}
//# sourceMappingURL=offer.controller.js.map