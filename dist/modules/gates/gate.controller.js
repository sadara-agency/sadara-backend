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
exports.getPlayerGates = getPlayerGates;
exports.create = create;
exports.initialize = initialize;
exports.advance = advance;
exports.update = update;
exports.remove = remove;
exports.addChecklistItem = addChecklistItem;
exports.toggleChecklistItem = toggleChecklistItem;
exports.deleteChecklistItem = deleteChecklistItem;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const gateService = __importStar(require("./gate.service"));
// ── List Gates ──
async function list(req, res) {
    const result = await gateService.listGates(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
// ── Get Gate by ID ──
async function getById(req, res) {
    const gate = await gateService.getGateById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, gate);
}
// ── Get Player Gates (pipeline view) ──
async function getPlayerGates(req, res) {
    const result = await gateService.getPlayerGates(req.params.playerId);
    (0, apiResponse_1.sendSuccess)(res, result);
}
// ── Create Gate ──
async function create(req, res) {
    const gate = await gateService.createGate(req.body);
    await (0, audit_1.logAudit)('CREATE', 'gates', gate.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Created Gate ${gate.gateNumber} for player ${gate.playerId}`);
    (0, apiResponse_1.sendCreated)(res, gate);
}
// ── Initialize Gate (create + seed default checklist) ──
async function initialize(req, res) {
    const gate = await gateService.initializeGate(req.body.playerId, req.body.gateNumber, {
        autoStart: req.body.autoStart ?? false,
        notes: req.body.notes,
    });
    await (0, audit_1.logAudit)('CREATE', 'gates', gate.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Initialized Gate ${req.body.gateNumber} for player ${req.body.playerId} with default checklist`);
    (0, apiResponse_1.sendCreated)(res, gate);
}
// ── Advance Gate (start / complete) ──
async function advance(req, res) {
    const gate = await gateService.advanceGate(req.params.id, req.body.action, req.user.id, req.body.notes);
    await (0, audit_1.logAudit)('UPDATE', 'gates', gate.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Gate ${gate.gateNumber} ${req.body.action === 'start' ? 'started' : 'completed'}`);
    (0, apiResponse_1.sendSuccess)(res, gate, `Gate ${req.body.action === 'start' ? 'started' : 'completed'}`);
}
// ── Update Gate ──
async function update(req, res) {
    const gate = await gateService.updateGate(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'gates', gate.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated Gate ${gate.gateNumber}`);
    (0, apiResponse_1.sendSuccess)(res, gate, 'Gate updated');
}
// ── Delete Gate ──
async function remove(req, res) {
    const result = await gateService.deleteGate(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'gates', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Gate deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Gate deleted');
}
// ══════════════════════════════════════════
// CHECKLIST OPERATIONS
// ══════════════════════════════════════════
// ── Add Checklist Item ──
async function addChecklistItem(req, res) {
    const item = await gateService.addChecklistItem(req.params.gateId, req.body);
    await (0, audit_1.logAudit)('CREATE', 'gate_checklists', item.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Added checklist item to gate ${req.params.gateId}`);
    (0, apiResponse_1.sendCreated)(res, item);
}
// ── Toggle Checklist Item ──
async function toggleChecklistItem(req, res) {
    const item = await gateService.toggleChecklistItem(req.params.itemId, req.body, req.user.id);
    await (0, audit_1.logAudit)('UPDATE', 'gate_checklists', item.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Checklist item ${item.isCompleted ? 'completed' : 'unchecked'}: ${item.item}`);
    (0, apiResponse_1.sendSuccess)(res, item, item.isCompleted ? 'Item completed' : 'Item unchecked');
}
// ── Delete Checklist Item ──
async function deleteChecklistItem(req, res) {
    const result = await gateService.deleteChecklistItem(req.params.itemId);
    await (0, audit_1.logAudit)('DELETE', 'gate_checklists', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Checklist item deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Checklist item deleted');
}
//# sourceMappingURL=gate.controller.js.map