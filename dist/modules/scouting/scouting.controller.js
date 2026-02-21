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
exports.listWatchlist = listWatchlist;
exports.getWatchlistById = getWatchlistById;
exports.createWatchlist = createWatchlist;
exports.updateWatchlist = updateWatchlist;
exports.updateWatchlistStatus = updateWatchlistStatus;
exports.deleteWatchlist = deleteWatchlist;
exports.createScreening = createScreening;
exports.getScreening = getScreening;
exports.updateScreening = updateScreening;
exports.markPackReady = markPackReady;
exports.createDecision = createDecision;
exports.getDecision = getDecision;
exports.pipelineSummary = pipelineSummary;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const scoutingService = __importStar(require("./scouting.service"));
// ══════════════════════════════════════════
// WATCHLIST
// ══════════════════════════════════════════
async function listWatchlist(req, res) {
    const result = await scoutingService.listWatchlist(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
async function getWatchlistById(req, res) {
    const item = await scoutingService.getWatchlistById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, item);
}
async function createWatchlist(req, res) {
    const item = await scoutingService.createWatchlist(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'watchlists', item.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Added prospect: ${item.prospectName}`);
    (0, apiResponse_1.sendCreated)(res, item);
}
async function updateWatchlist(req, res) {
    const item = await scoutingService.updateWatchlist(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'watchlists', item.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated prospect: ${item.prospectName}`);
    (0, apiResponse_1.sendSuccess)(res, item, 'Prospect updated');
}
async function updateWatchlistStatus(req, res) {
    const item = await scoutingService.updateWatchlistStatus(req.params.id, req.body.status);
    await (0, audit_1.logAudit)('UPDATE', 'watchlists', item.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Status → ${item.status}`);
    (0, apiResponse_1.sendSuccess)(res, item, `Status updated to ${item.status}`);
}
async function deleteWatchlist(req, res) {
    const result = await scoutingService.deleteWatchlist(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'watchlists', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Prospect removed');
    (0, apiResponse_1.sendSuccess)(res, result, 'Prospect deleted');
}
// ══════════════════════════════════════════
// SCREENING CASES
// ══════════════════════════════════════════
async function createScreening(req, res) {
    const sc = await scoutingService.createScreeningCase(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'screening_cases', sc.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Screening ${sc.caseNumber} created`);
    (0, apiResponse_1.sendCreated)(res, sc);
}
async function getScreening(req, res) {
    const sc = await scoutingService.getScreeningCase(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, sc);
}
async function updateScreening(req, res) {
    const sc = await scoutingService.updateScreeningCase(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'screening_cases', sc.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Screening ${sc.caseNumber} updated`);
    (0, apiResponse_1.sendSuccess)(res, sc, 'Screening case updated');
}
async function markPackReady(req, res) {
    const sc = await scoutingService.markPackReady(req.params.id, req.user.id);
    await (0, audit_1.logAudit)('UPDATE', 'screening_cases', sc.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Pack ready for ${sc.caseNumber}`);
    (0, apiResponse_1.sendSuccess)(res, sc, 'Pack marked as ready');
}
// ══════════════════════════════════════════
// SELECTION DECISIONS
// ══════════════════════════════════════════
async function createDecision(req, res) {
    const d = await scoutingService.createDecision(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'selection_decisions', d.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Decision: ${d.decision}`);
    (0, apiResponse_1.sendCreated)(res, d);
}
async function getDecision(req, res) {
    const d = await scoutingService.getDecision(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, d);
}
// ── Pipeline Summary ──
async function pipelineSummary(req, res) {
    const summary = await scoutingService.getPipelineSummary();
    (0, apiResponse_1.sendSuccess)(res, summary);
}
//# sourceMappingURL=scouting.controller.js.map