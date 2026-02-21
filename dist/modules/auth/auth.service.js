"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.invite = invite;
exports.login = login;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../Users/user.model");
const env_1 = require("../../config/env");
const errorHandler_1 = require("../../middleware/errorHandler");
/** Default role for self-registered users (no admin privileges). */
const DEFAULT_ROLE = 'Analyst';
/** Generate JWT with user identity + role for frontend RBAC. */
function generateToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email, fullName: user.fullName, role: user.role }, env_1.env.jwt.secret, { expiresIn: env_1.env.jwt.expiresIn });
}
// ── Public Register (default role, no role selection) ──
async function register(input) {
    const existing = await user_model_1.User.findOne({ where: { email: input.email } });
    if (existing)
        throw new errorHandler_1.AppError('Email already registered', 409);
    const passwordHash = await bcryptjs_1.default.hash(input.password, env_1.env.bcrypt.saltRounds);
    const user = await user_model_1.User.create({
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        fullNameAr: input.fullNameAr,
        role: DEFAULT_ROLE,
        isActive: false, // Inactive until admin approves or email is verified
    });
    const { passwordHash: _, ...safe } = user.get({ plain: true });
    return { user: safe };
}
// ── Admin Invite (Admin assigns role) ──
async function invite(input) {
    const existing = await user_model_1.User.findOne({ where: { email: input.email } });
    if (existing)
        throw new errorHandler_1.AppError('Email already registered', 409);
    const passwordHash = await bcryptjs_1.default.hash(input.password, env_1.env.bcrypt.saltRounds);
    const user = await user_model_1.User.create({
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        fullNameAr: input.fullNameAr,
        role: input.role,
        isActive: true, // Admin-invited users are active immediately
    });
    const { passwordHash: _, ...safe } = user.get({ plain: true });
    return { user: safe };
}
// ── Login ──
async function login(input) {
    const user = await user_model_1.User.findOne({ where: { email: input.email } });
    if (!user || !(await bcryptjs_1.default.compare(input.password, user.passwordHash))) {
        throw new errorHandler_1.AppError('Invalid email or password', 401);
    }
    if (!user.isActive) {
        throw new errorHandler_1.AppError('Account is not yet activated. Please wait for admin approval or verify your email.', 403);
    }
    await user.update({ lastLogin: new Date() });
    const { passwordHash, ...userWithoutPassword } = user.get({ plain: true });
    return {
        user: userWithoutPassword,
        token: generateToken(user),
    };
}
// ── Get Profile ──
async function getProfile(userId) {
    const user = await user_model_1.User.findByPk(userId);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    return user;
}
// ── Update Profile ──
async function updateProfile(userId, data) {
    const user = await user_model_1.User.findByPk(userId);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    await user.update(data);
    return user;
}
// ── Change Password ──
async function changePassword(userId, currentPassword, newPassword) {
    const user = await user_model_1.User.findByPk(userId);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    if (!(await bcryptjs_1.default.compare(currentPassword, user.passwordHash))) {
        throw new errorHandler_1.AppError('Current password is incorrect', 400);
    }
    const newHash = await bcryptjs_1.default.hash(newPassword, env_1.env.bcrypt.saltRounds);
    await user.update({ passwordHash: newHash });
    return { message: 'Password changed successfully' };
}
//# sourceMappingURL=auth.service.js.map