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
const express_1 = require("express");
const errorHandler_1 = require("../../middleware/errorHandler");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const auth_schema_1 = require("./auth.schema");
const authController = __importStar(require("./auth.controller"));
const router = (0, express_1.Router)();
// ── Public ──
router.post('/register', rateLimiter_1.authLimiter, (0, validate_1.validate)(auth_schema_1.registerSchema), (0, errorHandler_1.asyncHandler)(authController.register));
router.post('/login', rateLimiter_1.authLimiter, (0, validate_1.validate)(auth_schema_1.loginSchema), (0, errorHandler_1.asyncHandler)(authController.login));
router.post('/forgot-password', rateLimiter_1.authLimiter, (0, validate_1.validate)(auth_schema_1.forgotPasswordSchema), (0, errorHandler_1.asyncHandler)(authController.forgotPassword));
router.post('/reset-password', rateLimiter_1.authLimiter, (0, validate_1.validate)(auth_schema_1.resetPasswordSchema), (0, errorHandler_1.asyncHandler)(authController.resetPassword));
// ── Protected ──
router.get('/me', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(authController.getProfile));
router.patch('/me', auth_1.authenticate, (0, validate_1.validate)(auth_schema_1.updateProfileSchema), (0, errorHandler_1.asyncHandler)(authController.updateProfile));
router.post('/change-password', auth_1.authenticate, (0, validate_1.validate)(auth_schema_1.changePasswordSchema), (0, errorHandler_1.asyncHandler)(authController.changePassword));
// ── Admin Only — Invite user with specific role ──
router.post('/invite', auth_1.authenticate, (0, auth_1.authorize)('Admin'), (0, validate_1.validate)(auth_schema_1.inviteSchema), (0, errorHandler_1.asyncHandler)(authController.invite));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map