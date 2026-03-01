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
exports.getMyProfile = getMyProfile;
exports.getMySchedule = getMySchedule;
exports.getMyDocuments = getMyDocuments;
exports.getMyDevelopment = getMyDevelopment;
exports.generateInvite = generateInvite;
exports.completeRegistration = completeRegistration;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const portalService = __importStar(require("./portal.service"));
// ── My Profile ──
async function getMyProfile(req, res) {
    const data = await portalService.getMyProfile(req.user.id);
    (0, apiResponse_1.sendSuccess)(res, data);
}
// ── My Schedule ──
async function getMySchedule(req, res) {
    const data = await portalService.getMySchedule(req.user.id, req.query);
    (0, apiResponse_1.sendSuccess)(res, data);
}
// ── My Documents ──
async function getMyDocuments(req, res) {
    const data = await portalService.getMyDocuments(req.user.id);
    (0, apiResponse_1.sendSuccess)(res, data);
}
// ── My Development Plan ──
async function getMyDevelopment(req, res) {
    const data = await portalService.getMyDevelopment(req.user.id);
    (0, apiResponse_1.sendSuccess)(res, data);
}
// ── Generate Invite Link (Admin/Manager only) ──
async function generateInvite(req, res) {
    const { playerId } = req.body;
    const data = await portalService.generatePlayerInvite(playerId, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'users', null, (0, audit_1.buildAuditContext)(req.user, req.ip), `Generated player portal invite for ${data.playerName} (${data.playerEmail})`);
    (0, apiResponse_1.sendCreated)(res, data);
}
// ── Complete Registration (public — no auth) ──
async function completeRegistration(req, res) {
    const { token, password } = req.body;
    const data = await portalService.completePlayerRegistration(token, password);
    (0, apiResponse_1.sendSuccess)(res, data);
}
//# sourceMappingURL=portal.controller.js.map