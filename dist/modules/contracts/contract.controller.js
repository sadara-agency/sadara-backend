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
exports.remove = remove;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const contractService = __importStar(require("./contract.service"));
// ── List Contracts ──
async function list(req, res) {
    const result = await contractService.listContracts(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
// ── Get Contract by ID ──
async function getById(req, res) {
    const contract = await contractService.getContractById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, contract);
}
// ── Create Contract ──
async function create(req, res) {
    const contract = await contractService.createContract(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'contracts', contract.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Created contract: ${contract.title || 'Untitled'}`);
    (0, apiResponse_1.sendCreated)(res, contract);
}
// ── Update Contract ──
async function update(req, res) {
    const contract = await contractService.updateContract(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'contracts', req.params.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated contract: ${contract.title || 'Untitled'}`);
    (0, apiResponse_1.sendSuccess)(res, contract, 'Contract updated');
}
// ── Delete Contract ──
async function remove(req, res) {
    const result = await contractService.deleteContract(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'contracts', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Contract deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Contract deleted');
}
//# sourceMappingURL=contract.controller.js.map