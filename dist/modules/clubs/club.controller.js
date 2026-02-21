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
const clubService = __importStar(require("./club.service"));
async function list(req, res) {
    const result = await clubService.listClubs(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
async function getById(req, res) {
    const club = await clubService.getClubById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, club);
}
async function create(req, res) {
    const club = await clubService.createClub(req.body);
    await (0, audit_1.logAudit)('CREATE', 'clubs', club.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Created club: ${club.name}`);
    (0, apiResponse_1.sendCreated)(res, club);
}
async function update(req, res) {
    const club = await clubService.updateClub(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'clubs', club.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated club: ${club.name}`);
    (0, apiResponse_1.sendSuccess)(res, club, 'Club updated');
}
async function remove(req, res) {
    const result = await clubService.deleteClub(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'clubs', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Club deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Club deleted');
}
//# sourceMappingURL=club.controller.js.map