"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const apiResponse_1 = require("../shared/utils/apiResponse");
// ── Verify JWT Token ──
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        (0, apiResponse_1.sendUnauthorized)(res, 'No token provided');
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwt.secret);
        req.user = decoded;
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            (0, apiResponse_1.sendUnauthorized)(res, 'Token expired');
        }
        else {
            (0, apiResponse_1.sendUnauthorized)(res, 'Invalid token');
        }
    }
}
// ── Role-based Authorization ──
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            (0, apiResponse_1.sendUnauthorized)(res);
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            (0, apiResponse_1.sendForbidden)(res, `Role '${req.user.role}' does not have access to this resource`);
            return;
        }
        next();
    };
}
// ── Optional auth (doesn't fail if no token) ──
function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            req.user = jsonwebtoken_1.default.verify(token, env_1.env.jwt.secret);
        }
        catch {
            // Ignore invalid tokens for optional auth
        }
    }
    next();
}
//# sourceMappingURL=auth.js.map