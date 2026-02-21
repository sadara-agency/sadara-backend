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
exports.resetPassword = resetPassword;
exports.remove = remove;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const userService = __importStar(require("./user.service"));
// ── List Users ──
async function list(req, res) {
    const result = await userService.listUsers(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
// ── Get User by ID ──
async function getById(req, res) {
    const user = await userService.getUserById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, user);
}
// ── Create User ──
async function create(req, res) {
    const user = await userService.createUser(req.body);
    await (0, audit_1.logAudit)('CREATE', 'users', user.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Created user: ${user.fullName} (${user.role})`);
    (0, apiResponse_1.sendCreated)(res, user);
}
// ── Update User ──
async function update(req, res) {
    const user = await userService.updateUser(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'users', user.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated user: ${user.fullName}`);
    (0, apiResponse_1.sendSuccess)(res, user, 'User updated');
}
// ── Reset Password ──
async function resetPassword(req, res) {
    const result = await userService.resetPassword(req.params.id, req.body.newPassword);
    await (0, audit_1.logAudit)('UPDATE', 'users', req.params.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Admin reset user password');
    (0, apiResponse_1.sendSuccess)(res, result);
}
// ── Delete User ──
async function remove(req, res) {
    const result = await userService.deleteUser(req.params.id, req.user.id);
    await (0, audit_1.logAudit)('DELETE', 'users', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'User deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'User deleted');
}
//# sourceMappingURL=user.controller.js.map