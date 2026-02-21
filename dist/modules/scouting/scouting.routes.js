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
const scouting_schema_1 = require("./scouting.schema");
const ctrl = __importStar(require("./scouting.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ── Pipeline Summary ──
router.get('/summary', (0, errorHandler_1.asyncHandler)(ctrl.pipelineSummary));
// ── Watchlist ──
router.get('/watchlist', (0, validate_1.validate)(scouting_schema_1.watchlistQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(ctrl.listWatchlist));
router.get('/watchlist/:id', (0, errorHandler_1.asyncHandler)(ctrl.getWatchlistById));
router.post('/watchlist', (0, auth_1.authorize)('Admin', 'Manager', 'Analyst'), (0, validate_1.validate)(scouting_schema_1.createWatchlistSchema), (0, errorHandler_1.asyncHandler)(ctrl.createWatchlist));
router.patch('/watchlist/:id', (0, auth_1.authorize)('Admin', 'Manager', 'Analyst'), (0, validate_1.validate)(scouting_schema_1.updateWatchlistSchema), (0, errorHandler_1.asyncHandler)(ctrl.updateWatchlist));
router.patch('/watchlist/:id/status', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(scouting_schema_1.updateWatchlistStatusSchema), (0, errorHandler_1.asyncHandler)(ctrl.updateWatchlistStatus));
router.delete('/watchlist/:id', (0, auth_1.authorize)('Admin'), (0, errorHandler_1.asyncHandler)(ctrl.deleteWatchlist));
// ── Screening Cases ──
router.post('/screening', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(scouting_schema_1.createScreeningSchema), (0, errorHandler_1.asyncHandler)(ctrl.createScreening));
router.get('/screening/:id', (0, errorHandler_1.asyncHandler)(ctrl.getScreening));
router.patch('/screening/:id', (0, auth_1.authorize)('Admin', 'Manager', 'Analyst'), (0, validate_1.validate)(scouting_schema_1.updateScreeningSchema), (0, errorHandler_1.asyncHandler)(ctrl.updateScreening));
router.patch('/screening/:id/pack-ready', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(scouting_schema_1.markPackReadySchema), (0, errorHandler_1.asyncHandler)(ctrl.markPackReady));
// ── Selection Decisions (immutable — create + read only) ──
router.post('/decisions', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(scouting_schema_1.createDecisionSchema), (0, errorHandler_1.asyncHandler)(ctrl.createDecision));
router.get('/decisions/:id', (0, errorHandler_1.asyncHandler)(ctrl.getDecision));
exports.default = router;
//# sourceMappingURL=scouting.routes.js.map