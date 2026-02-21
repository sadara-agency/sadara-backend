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
exports.upcoming = upcoming;
exports.create = create;
exports.update = update;
exports.updateScore = updateScore;
exports.updateStatus = updateStatus;
exports.remove = remove;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const matchService = __importStar(require("./match.service"));
// ── List Matches ──
async function list(req, res) {
    const result = await matchService.listMatches(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
// ── Get Match by ID ──
async function getById(req, res) {
    const match = await matchService.getMatchById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, match);
}
// ── Get Upcoming Matches ──
async function upcoming(req, res) {
    const days = Number(req.query.days) || 7;
    const limit = Number(req.query.limit) || 10;
    const matches = await matchService.getUpcomingMatches(days, limit);
    (0, apiResponse_1.sendSuccess)(res, matches);
}
// ── Create Match ──
async function create(req, res) {
    const match = await matchService.createMatch(req.body);
    await (0, audit_1.logAudit)('CREATE', 'matches', match.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Created match: ${match.competition || 'Match'} on ${match.matchDate}`);
    (0, apiResponse_1.sendCreated)(res, match);
}
// ── Update Match ──
async function update(req, res) {
    const match = await matchService.updateMatch(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'matches', match.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated match ${match.id}`);
    (0, apiResponse_1.sendSuccess)(res, match, 'Match updated');
}
// ── Update Score ──
async function updateScore(req, res) {
    const match = await matchService.updateScore(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'matches', match.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Score updated: ${match.homeScore}-${match.awayScore}`);
    (0, apiResponse_1.sendSuccess)(res, match, 'Score updated');
}
// ── Update Status ──
async function updateStatus(req, res) {
    const match = await matchService.updateMatchStatus(req.params.id, req.body.status);
    await (0, audit_1.logAudit)('UPDATE', 'matches', match.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Match status changed to ${match.status}`);
    (0, apiResponse_1.sendSuccess)(res, match, `Match status updated to ${match.status}`);
}
// ── Delete Match ──
async function remove(req, res) {
    const result = await matchService.deleteMatch(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'matches', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Match deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Match deleted');
}
//# sourceMappingURL=match.controller.js.map