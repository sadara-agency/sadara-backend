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
exports.addUpdate = addUpdate;
exports.remove = remove;
exports.stats = stats;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const svc = __importStar(require("./injury.service"));
async function list(req, res) {
    const result = await svc.listInjuries(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
async function getById(req, res) {
    const injury = await svc.getInjuryById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, injury);
}
async function getByPlayer(req, res) {
    const injuries = await svc.getPlayerInjuries(req.params.playerId);
    (0, apiResponse_1.sendSuccess)(res, injuries);
}
async function create(req, res) {
    const injury = await svc.createInjury(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'injuries', injury.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Logged injury: ${req.body.injuryType} for player ${req.body.playerId}`);
    (0, apiResponse_1.sendCreated)(res, injury);
}
async function update(req, res) {
    const injury = await svc.updateInjury(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'injuries', injury.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated injury ${injury.id}`);
    (0, apiResponse_1.sendSuccess)(res, injury, 'Injury updated');
}
async function addUpdate(req, res) {
    const update = await svc.addInjuryUpdate(req.params.id, req.body, req.user.id);
    await (0, audit_1.logAudit)('UPDATE', 'injuries', req.params.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Added progress update to injury ${req.params.id}`);
    (0, apiResponse_1.sendCreated)(res, update);
}
async function remove(req, res) {
    const result = await svc.deleteInjury(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'injuries', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Injury deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Injury deleted');
}
async function stats(req, res) {
    const data = await svc.getInjuryStats();
    (0, apiResponse_1.sendSuccess)(res, data);
}
//# sourceMappingURL=injury.controller.js.map