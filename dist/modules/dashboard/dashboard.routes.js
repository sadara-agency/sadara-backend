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
const cache_middleware_1 = require("../../middleware/cache.middleware");
const cache_1 = require("../../shared/utils/cache");
const dashboardController = __importStar(require("./dashboard.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Full aggregated dashboard — short TTL (changes frequently)
router.get('/', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.SHORT), (0, errorHandler_1.asyncHandler)(dashboardController.getFullDashboard));
// Individual endpoints — short TTL for volatile data
router.get('/kpis', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.SHORT), (0, errorHandler_1.asyncHandler)(dashboardController.getKpis));
router.get('/alerts', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.SHORT), (0, errorHandler_1.asyncHandler)(dashboardController.getAlerts));
router.get('/today', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.SHORT), (0, errorHandler_1.asyncHandler)(dashboardController.getTodayOverview));
router.get('/top-players', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.MEDIUM), (0, errorHandler_1.asyncHandler)(dashboardController.getTopPlayers));
router.get('/contracts/status', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.MEDIUM), (0, errorHandler_1.asyncHandler)(dashboardController.getContractStatus));
router.get('/players/distribution', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.MEDIUM), (0, errorHandler_1.asyncHandler)(dashboardController.getPlayerDistribution));
router.get('/offers/recent', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.SHORT), (0, errorHandler_1.asyncHandler)(dashboardController.getRecentOffers));
router.get('/matches/upcoming', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.SHORT), (0, errorHandler_1.asyncHandler)(dashboardController.getUpcomingMatches));
router.get('/tasks/urgent', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.SHORT), (0, errorHandler_1.asyncHandler)(dashboardController.getUrgentTasks));
router.get('/revenue', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.MEDIUM), (0, errorHandler_1.asyncHandler)(dashboardController.getRevenueChart));
router.get('/performance', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.MEDIUM), (0, errorHandler_1.asyncHandler)(dashboardController.getPerformanceAverages));
router.get('/activity', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.SHORT), (0, errorHandler_1.asyncHandler)(dashboardController.getRecentActivity));
router.get('/quick-stats', (0, cache_middleware_1.cacheRoute)('dash', cache_1.CacheTTL.SHORT), (0, errorHandler_1.asyncHandler)(dashboardController.getQuickStats));
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map