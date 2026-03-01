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
const saff_schema_1 = require("./saff.schema");
const saffController = __importStar(require("./saff.controller"));
const router = (0, express_1.Router)();
// All SAFF routes require authentication
router.use(auth_1.authenticate);
// ── Tournaments ──
router.get('/tournaments', (0, validate_1.validate)(saff_schema_1.tournamentQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(saffController.listTournaments));
router.post('/tournaments/seed', (0, auth_1.authorize)('Admin'), (0, errorHandler_1.asyncHandler)(saffController.seedTournaments));
// ── Fetch (Scrape from SAFF) ──
router.post('/fetch', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(saff_schema_1.fetchRequestSchema), (0, errorHandler_1.asyncHandler)(saffController.fetchFromSaff));
// ── Standings ──
router.get('/standings', (0, validate_1.validate)(saff_schema_1.standingQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(saffController.listStandings));
// ── Fixtures ──
router.get('/fixtures', (0, validate_1.validate)(saff_schema_1.fixtureQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(saffController.listFixtures));
// ── Team Mappings ──
router.get('/team-maps', (0, validate_1.validate)(saff_schema_1.teamMapQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(saffController.listTeamMaps));
router.post('/team-maps', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(saff_schema_1.mapTeamSchema), (0, errorHandler_1.asyncHandler)(saffController.mapTeam));
// ── Import to Sadara ──
router.post('/import', (0, auth_1.authorize)('Admin'), (0, validate_1.validate)(saff_schema_1.importRequestSchema), (0, errorHandler_1.asyncHandler)(saffController.importToSadara));
// ── Stats ──
router.get('/stats', (0, errorHandler_1.asyncHandler)(saffController.getStats));
// ── Sync (Scheduler) ──
router.get('/sync-status', (0, errorHandler_1.asyncHandler)(saffController.getSyncStatus));
router.post('/sync-now', (0, auth_1.authorize)('Admin'), (0, errorHandler_1.asyncHandler)(saffController.triggerSync));
exports.default = router;
//# sourceMappingURL=saff.routes.js.map