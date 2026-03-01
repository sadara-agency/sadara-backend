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
const match_schema_1 = require("./match.schema");
const ctrl = __importStar(require("./match.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ── Calendar (must be before /:id to avoid route conflict) ──
router.get('/calendar', (0, validate_1.validate)(match_schema_1.calendarQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(ctrl.calendar));
// ── Upcoming ──
router.get('/upcoming', (0, errorHandler_1.asyncHandler)(ctrl.upcoming));
// ── Player-centric routes (for player profile) ──
router.get('/player/:playerId', (0, validate_1.validate)(match_schema_1.playerMatchesQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(ctrl.playerMatches));
router.get('/player/:playerId/stats', (0, errorHandler_1.asyncHandler)(ctrl.playerAggregateStats));
// ── Match CRUD ──
router.get('/', (0, validate_1.validate)(match_schema_1.matchQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(ctrl.list));
router.get('/:id', (0, errorHandler_1.asyncHandler)(ctrl.getById));
router.post('/', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(match_schema_1.createMatchSchema), (0, errorHandler_1.asyncHandler)(ctrl.create));
router.patch('/:id', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(match_schema_1.updateMatchSchema), (0, errorHandler_1.asyncHandler)(ctrl.update));
router.patch('/:id/score', (0, auth_1.authorize)('Admin', 'Manager', 'Analyst'), (0, validate_1.validate)(match_schema_1.updateScoreSchema), (0, errorHandler_1.asyncHandler)(ctrl.updateScore));
router.patch('/:id/status', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(match_schema_1.updateMatchStatusSchema), (0, errorHandler_1.asyncHandler)(ctrl.updateStatus));
router.delete('/:id', (0, auth_1.authorize)('Admin'), (0, errorHandler_1.asyncHandler)(ctrl.remove));
// ── Match Players (assign/manage players in a match) ──
router.get('/:id/players', (0, errorHandler_1.asyncHandler)(ctrl.getPlayers));
router.post('/:id/players', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(match_schema_1.assignPlayersSchema), (0, errorHandler_1.asyncHandler)(ctrl.assignPlayers));
router.patch('/:id/players/:playerId', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(match_schema_1.updateMatchPlayerSchema), (0, errorHandler_1.asyncHandler)(ctrl.updatePlayer));
router.delete('/:id/players/:playerId', (0, auth_1.authorize)('Admin', 'Manager'), (0, errorHandler_1.asyncHandler)(ctrl.removePlayer));
// ── Player Match Stats ──
router.get('/:id/stats', (0, errorHandler_1.asyncHandler)(ctrl.getStats));
router.post('/:id/stats', (0, auth_1.authorize)('Admin', 'Manager', 'Analyst'), (0, validate_1.validate)(match_schema_1.bulkStatsSchema), (0, errorHandler_1.asyncHandler)(ctrl.upsertStats));
router.patch('/:id/stats/:playerId', (0, auth_1.authorize)('Admin', 'Manager', 'Analyst'), (0, validate_1.validate)(match_schema_1.updateStatsSchema), (0, errorHandler_1.asyncHandler)(ctrl.updatePlayerStats));
router.delete('/:id/stats/:playerId', (0, auth_1.authorize)('Admin', 'Manager'), (0, errorHandler_1.asyncHandler)(ctrl.deletePlayerStats));
exports.default = router;
//# sourceMappingURL=match.routes.js.map