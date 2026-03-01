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
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sequelize_1 = require("sequelize");
const user_model_1 = require("../Users/user.model");
const env_1 = require("../../config/env");
const errorHandler_1 = require("../../middleware/errorHandler");
const mail_1 = require("../../shared/utils/mail");
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
        isActive: false,
    });
    const { passwordHash: _, ...safe } = user.get({ plain: true });
    // Send welcome email (non-blocking — don't fail registration if email fails)
    (0, mail_1.sendWelcomeEmail)(user.email, user.fullName || user.fullNameAr || '').catch(() => { });
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
        isActive: true,
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
// ── Change Password (authenticated user) ──
async function changePassword(userId, currentPassword, newPassword) {
    const user = await user_model_1.User.findByPk(userId);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    if (!(await bcryptjs_1.default.compare(currentPassword, user.passwordHash))) {
        throw new errorHandler_1.AppError('Current password is incorrect', 400);
    }
    const newHash = await bcryptjs_1.default.hash(newPassword, env_1.env.bcrypt.saltRounds);
    await user.update({ passwordHash: newHash });
    // Send confirmation email (non-blocking)
    (0, mail_1.sendPasswordChangedEmail)(user.email, user.fullName || user.fullNameAr || '').catch(() => { });
    return { message: 'Password changed successfully' };
}
// ════════════════════════════════════════════════════════════
// Forgot Password — generates a reset token, sends email
// ════════════════════════════════════════════════════════════
async function forgotPassword(email) {
    const user = await user_model_1.User.findOne({ where: { email } });
    // Always return success to prevent email enumeration attacks
    if (!user) {
        return { message: 'If this email exists, a reset link has been sent.' };
    }
    // Generate a secure random token
    const rawToken = crypto_1.default.randomBytes(32).toString('hex');
    // Store a hash of the token (never store raw tokens in DB)
    const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
    // Token expires in 1 hour
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.update({
        resetToken: tokenHash,
        resetTokenExpiry: expiry,
    });
    // Build the reset URL
    const resetUrl = `${env_1.env.frontend.url}/reset-password?token=${rawToken}`;
    // Send the email (uses SMTP if configured, falls back to console.log)
    const emailSent = await (0, mail_1.sendPasswordResetEmail)(user.email, user.fullName || user.fullNameAr || '', resetUrl);
    // Also log to console as backup (useful for Railway logs)
    console.log('═══════════════════════════════════════════════');
    console.log('🔑 PASSWORD RESET REQUEST');
    console.log(`   Email:      ${email}`);
    console.log(`   Email sent: ${emailSent ? '✅ Yes' : '❌ No (logged only)'}`);
    console.log(`   Expiry:     ${expiry.toISOString()}`);
    if (!emailSent) {
        console.log(`   Token:      ${rawToken}`);
        console.log(`   URL:        ${resetUrl}`);
    }
    console.log('═══════════════════════════════════════════════');
    // In dev mode, return the token in the response for testing
    const isDev = env_1.env.nodeEnv !== 'production';
    return {
        message: 'If this email exists, a reset link has been sent.',
        ...(isDev && { resetUrl, token: rawToken }),
    };
}
// ════════════════════════════════════════════════════════════
// Reset Password — validates token and sets new password
// ════════════════════════════════════════════════════════════
async function resetPassword(token, newPassword) {
    // Hash the incoming token to compare against stored hash
    const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
    const user = await user_model_1.User.findOne({
        where: {
            resetToken: tokenHash,
            resetTokenExpiry: { [sequelize_1.Op.gt]: new Date() },
        },
    });
    if (!user) {
        throw new errorHandler_1.AppError('Invalid or expired reset token', 400);
    }
    // Hash the new password and clear the reset token
    const passwordHash = await bcryptjs_1.default.hash(newPassword, env_1.env.bcrypt.saltRounds);
    await user.update({
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
    });
    // Send confirmation email (non-blocking)
    (0, mail_1.sendPasswordChangedEmail)(user.email, user.fullName || user.fullNameAr || '').catch(() => { });
    return { message: 'Password reset successfully. You can now log in.' };
}
//# sourceMappingURL=auth.service.js.map