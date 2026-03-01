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
const cache_middleware_1 = require("../../middleware/cache.middleware");
const cache_1 = require("../../shared/utils/cache");
const player_schema_1 = require("./utils/player.schema");
const playerController = __importStar(require("./player.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ── Read (cached) ──
router.get('/', (0, validate_1.validate)(player_schema_1.playerQuerySchema, 'query'), (0, cache_middleware_1.cacheRoute)('players', cache_1.CacheTTL.MEDIUM), (0, errorHandler_1.asyncHandler)(playerController.list));
router.get('/:id', (0, cache_middleware_1.cacheRoute)('player', cache_1.CacheTTL.MEDIUM), (0, errorHandler_1.asyncHandler)(playerController.getById));
// ── Write (no cache — these invalidate) ──
router.post('/', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(player_schema_1.createPlayerSchema), (0, errorHandler_1.asyncHandler)(playerController.create));
router.patch('/:id', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(player_schema_1.updatePlayerSchema), (0, errorHandler_1.asyncHandler)(playerController.update));
router.delete('/:id', (0, auth_1.authorize)('Admin'), (0, errorHandler_1.asyncHandler)(playerController.remove));
router.get('/:id/providers', (0, errorHandler_1.asyncHandler)(playerController.getProviders));
router.put('/:id/providers', (0, errorHandler_1.asyncHandler)(playerController.upsertProvider));
router.delete('/:id/providers/:provider', (0, errorHandler_1.asyncHandler)(playerController.removeProvider));
exports.default = router;
//# sourceMappingURL=player.routes.js.map