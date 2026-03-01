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
exports.register = register;
exports.invite = invite;
exports.login = login;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const authService = __importStar(require("./auth.service"));
// ── Public Register (no token returned, account inactive) ──
async function register(req, res) {
    const result = await authService.register(req.body);
    await (0, audit_1.logAudit)('REGISTER', 'users', result.user.id, {
        userId: result.user.id,
        userName: result.user.fullName ?? result.user.fullNameAr,
        userRole: 'Analyst',
        ip: req.ip,
    });
    (0, apiResponse_1.sendCreated)(res, { user: { id: result.user.id, email: result.user.email } }, 'Registration successful. Please check your email for verification.');
}
// ── Admin Invite (creates active user with assigned role) ──
async function invite(req, res) {
    const result = await authService.invite(req.body);
    await (0, audit_1.logAudit)('INVITE', 'users', result.user.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Invited ${result.user.email} as ${result.user.role}`);
    (0, apiResponse_1.sendCreated)(res, result, 'User invited successfully');
}
// ── Login ──
async function login(req, res) {
    const result = await authService.login(req.body);
    await (0, audit_1.logAudit)('LOGIN', 'users', result.user.id, {
        userId: result.user.id,
        userName: result.user.fullName ?? result.user.fullNameAr,
        userRole: result.user.role,
        ip: req.ip,
    });
    (0, apiResponse_1.sendSuccess)(res, result, 'Login successful');
}
// ── Profile ──
async function getProfile(req, res) {
    const user = await authService.getProfile(req.user.id);
    (0, apiResponse_1.sendSuccess)(res, user);
}
async function updateProfile(req, res) {
    const user = await authService.updateProfile(req.user.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'users', req.user.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Profile updated');
    (0, apiResponse_1.sendSuccess)(res, user, 'Profile updated');
}
async function changePassword(req, res) {
    const result = await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    await (0, audit_1.logAudit)('UPDATE', 'users', req.user.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Password changed');
    (0, apiResponse_1.sendSuccess)(res, result);
}
// ── Forgot Password (public — request reset link) ──
async function forgotPassword(req, res) {
    const result = await authService.forgotPassword(req.body.email);
    (0, apiResponse_1.sendSuccess)(res, result);
}
// ── Reset Password (public — set new password with token) ──
async function resetPassword(req, res) {
    const result = await authService.resetPassword(req.body.token, req.body.newPassword);
    (0, apiResponse_1.sendSuccess)(res, result);
}
//# sourceMappingURL=auth.controller.js.map