"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../../middleware/errorHandler");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const user_model_1 = require("../Users/user.model");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const pagination_1 = require("../../shared/utils/pagination");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ── Schemas ──
const updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1).max(255).optional(),
    fullNameAr: zod_1.z.string().max(255).optional(),
    avatarUrl: zod_1.z.string().url().nullable().optional(),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8).max(128),
});
const teamQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(50).default(20),
    search: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    isActive: zod_1.z.coerce.boolean().optional(),
});
const updateUserSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1).max(255).optional(),
    fullNameAr: zod_1.z.string().max(255).optional(),
    role: zod_1.z.enum(['Admin', 'Manager', 'Analyst', 'Scout', 'Player']).optional(),
    isActive: zod_1.z.boolean().optional(),
});
const notificationPrefsSchema = zod_1.z.object({
    contracts: zod_1.z.boolean().optional(),
    offers: zod_1.z.boolean().optional(),
    matches: zod_1.z.boolean().optional(),
    tasks: zod_1.z.boolean().optional(),
    email: zod_1.z.boolean().optional(),
    push: zod_1.z.boolean().optional(),
    sms: zod_1.z.boolean().optional(),
});
const DEFAULT_NOTIFICATION_PREFS = {
    contracts: true,
    offers: true,
    matches: true,
    tasks: true,
    email: true,
    push: false,
    sms: false,
};
const SAFE_ATTRS = ['id', 'email', 'fullName', 'fullNameAr', 'role', 'avatarUrl', 'isActive', 'lastLogin', 'createdAt'];
// ══════════════════════════════════════════
// PROFILE (current user)
// ══════════════════════════════════════════
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    let user = await user_model_1.User.findByPk(req.user.id, {
        attributes: [...SAFE_ATTRS],
    });
    // If user was deleted/DB reseeded, return JWT payload as fallback
    if (!user) {
        (0, apiResponse_1.sendSuccess)(res, {
            id: req.user.id,
            email: req.user.email,
            fullName: req.user.fullName,
            fullNameAr: null,
            role: req.user.role,
            avatarUrl: null,
            isActive: true,
            twoFactorEnabled: false,
        });
        return;
    }
    const [tfRow] = await database_1.sequelize.query(`SELECT two_factor_enabled FROM users WHERE id = $1`, { bind: [req.user.id], type: sequelize_1.QueryTypes.SELECT });
    const result = { ...user.toJSON(), twoFactorEnabled: tfRow?.two_factor_enabled ?? false };
    (0, apiResponse_1.sendSuccess)(res, result);
}));
router.patch('/profile', (0, validate_1.validate)(updateProfileSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_model_1.User.findByPk(req.user.id);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    await user.update(req.body);
    await (0, audit_1.logAudit)('UPDATE', 'users', user.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Profile updated');
    (0, apiResponse_1.sendSuccess)(res, user, 'Profile updated');
}));
router.post('/change-password', (0, validate_1.validate)(changePasswordSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_model_1.User.findByPk(req.user.id);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    const valid = await bcrypt_1.default.compare(req.body.currentPassword, user.passwordHash);
    if (!valid)
        throw new errorHandler_1.AppError('Current password is incorrect', 401);
    const hash = await bcrypt_1.default.hash(req.body.newPassword, 12);
    await user.update({ passwordHash: hash });
    await (0, audit_1.logAudit)('UPDATE', 'users', user.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Password changed');
    (0, apiResponse_1.sendSuccess)(res, null, 'Password changed successfully');
}));
// ══════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ══════════════════════════════════════════
router.get('/notifications', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_model_1.User.findByPk(req.user.id, {
        attributes: ['id', 'notificationPreferences'],
    });
    (0, apiResponse_1.sendSuccess)(res, user?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS);
}));
router.patch('/notifications', (0, validate_1.validate)(notificationPrefsSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_model_1.User.findByPk(req.user.id);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    const currentPrefs = user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS;
    const updatedPrefs = { ...currentPrefs, ...req.body };
    await user.update({ notificationPreferences: updatedPrefs });
    await (0, audit_1.logAudit)('UPDATE', 'users', user.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Notification preferences updated');
    (0, apiResponse_1.sendSuccess)(res, updatedPrefs, 'Notification preferences updated');
}));
// ══════════════════════════════════════════
// TEAM (users list — Admin/Manager only)
// ══════════════════════════════════════════
router.get('/team', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(teamQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit, offset, page } = (0, pagination_1.parsePagination)(req.query, 'createdAt');
    const where = {};
    if (req.query.role)
        where.role = req.query.role;
    if (req.query.isActive !== undefined)
        where.isActive = req.query.isActive;
    if (req.query.search) {
        const s = req.query.search;
        where[sequelize_1.Op.or] = [
            { fullName: { [sequelize_1.Op.iLike]: `%${s}%` } },
            { fullNameAr: { [sequelize_1.Op.iLike]: `%${s}%` } },
            { email: { [sequelize_1.Op.iLike]: `%${s}%` } },
        ];
    }
    const { count, rows } = await user_model_1.User.findAndCountAll({
        where, limit, offset, order: [['created_at', 'DESC']], attributes: [...SAFE_ATTRS],
    });
    (0, apiResponse_1.sendPaginated)(res, rows, (0, pagination_1.buildMeta)(count, page, limit));
}));
router.patch('/team/:id', (0, auth_1.authorize)('Admin'), (0, validate_1.validate)(updateUserSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_model_1.User.findByPk(req.params.id);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    await user.update(req.body);
    await (0, audit_1.logAudit)('UPDATE', 'users', user.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Team member updated: ${user.fullName}`);
    (0, apiResponse_1.sendSuccess)(res, user, 'User updated');
}));
exports.default = router;
//# sourceMappingURL=settings.routes.js.map