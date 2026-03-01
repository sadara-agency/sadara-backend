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
const portalController = __importStar(require("./portal.controller"));
const router = (0, express_1.Router)();
// ── Public route: complete registration via invite token ──
router.post('/register', (0, errorHandler_1.asyncHandler)(portalController.completeRegistration));
// ── All other portal routes require authentication ──
router.use(auth_1.authenticate);
// ── Player-only routes (role: Player) ──
router.get('/me', (0, auth_1.authorize)('Player'), (0, errorHandler_1.asyncHandler)(portalController.getMyProfile));
router.get('/schedule', (0, auth_1.authorize)('Player'), (0, errorHandler_1.asyncHandler)(portalController.getMySchedule));
router.get('/documents', (0, auth_1.authorize)('Player'), (0, errorHandler_1.asyncHandler)(portalController.getMyDocuments));
router.get('/development', (0, auth_1.authorize)('Player'), (0, errorHandler_1.asyncHandler)(portalController.getMyDevelopment));
// ── Admin/Manager routes: generate invite links ──
router.post('/invite', (0, auth_1.authorize)('Admin', 'Manager'), (0, errorHandler_1.asyncHandler)(portalController.generateInvite));
exports.default = router;
//# sourceMappingURL=portal.routes.js.map