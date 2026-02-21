"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.getUserById = getUserById;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.resetPassword = resetPassword;
exports.deleteUser = deleteUser;
// ─────────────────────────────────────────────────────────────
// src/modules/Users/user.service.ts
// Business logic for admin user management (CRUD).
//
// This is separate from auth.service.ts which handles
// login/register/profile for the authenticated user.
// This module lets Admins manage ALL users in the system.
// ─────────────────────────────────────────────────────────────
const sequelize_1 = require("sequelize");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_model_1 = require("./user.model");
const env_1 = require("../../config/env");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
// ── Attributes to exclude from every response ──
const SAFE_ATTRIBUTES = {
    exclude: ['passwordHash'],
};
// ────────────────────────────────────────────────────────────
// List Users
// ────────────────────────────────────────────────────────────
async function listUsers(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'createdAt');
    const where = {};
    if (queryParams.role)
        where.role = queryParams.role;
    if (queryParams.isActive !== undefined)
        where.isActive = queryParams.isActive;
    if (search) {
        const pattern = `%${search}%`;
        where[sequelize_1.Op.or] = [
            { fullName: { [sequelize_1.Op.iLike]: pattern } },
            { fullNameAr: { [sequelize_1.Op.iLike]: pattern } },
            { email: { [sequelize_1.Op.iLike]: pattern } },
        ];
    }
    const { count, rows } = await user_model_1.User.findAndCountAll({
        where,
        attributes: SAFE_ATTRIBUTES,
        limit,
        offset,
        order: [[sort, order]],
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ────────────────────────────────────────────────────────────
// Get User by ID
// ────────────────────────────────────────────────────────────
async function getUserById(id) {
    const user = await user_model_1.User.findByPk(id, {
        attributes: SAFE_ATTRIBUTES,
    });
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    return user;
}
// ────────────────────────────────────────────────────────────
// Create User (Admin creates a team member)
// ────────────────────────────────────────────────────────────
async function createUser(input) {
    // Check for duplicate email
    const existing = await user_model_1.User.findOne({ where: { email: input.email } });
    if (existing)
        throw new errorHandler_1.AppError('Email already registered', 409);
    // Hash the password
    const passwordHash = await bcryptjs_1.default.hash(input.password, env_1.env.bcrypt.saltRounds);
    const user = await user_model_1.User.create({
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        fullNameAr: input.fullNameAr,
        role: input.role,
        avatarUrl: input.avatarUrl,
        isActive: input.isActive,
    });
    // Return without passwordHash
    const { passwordHash: _, ...safeUser } = user.get({ plain: true });
    return safeUser;
}
// ────────────────────────────────────────────────────────────
// Update User
// ────────────────────────────────────────────────────────────
async function updateUser(id, input) {
    const user = await user_model_1.User.findByPk(id);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    // If email is being changed, check for duplicates
    if (input.email && input.email !== user.email) {
        const existing = await user_model_1.User.findOne({ where: { email: input.email } });
        if (existing)
            throw new errorHandler_1.AppError('Email already in use', 409);
    }
    await user.update(input);
    // Return without passwordHash
    const { passwordHash: _, ...safeUser } = user.get({ plain: true });
    return safeUser;
}
// ────────────────────────────────────────────────────────────
// Reset Password (Admin force-resets another user's password)
// ────────────────────────────────────────────────────────────
async function resetPassword(id, newPassword) {
    const user = await user_model_1.User.findByPk(id);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    const passwordHash = await bcryptjs_1.default.hash(newPassword, env_1.env.bcrypt.saltRounds);
    await user.update({ passwordHash });
    return { message: 'Password reset successfully' };
}
// ────────────────────────────────────────────────────────────
// Delete User (soft or hard — currently hard delete)
// ────────────────────────────────────────────────────────────
async function deleteUser(id, requesterId) {
    // Prevent self-deletion
    if (id === requesterId) {
        throw new errorHandler_1.AppError('Cannot delete your own account', 400);
    }
    const user = await user_model_1.User.findByPk(id);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    await user.destroy();
    return { id };
}
//# sourceMappingURL=user.service.js.map