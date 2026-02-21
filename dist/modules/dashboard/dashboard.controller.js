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
exports.getFullDashboard = getFullDashboard;
exports.getKpis = getKpis;
exports.getAlerts = getAlerts;
exports.getTodayOverview = getTodayOverview;
exports.getTopPlayers = getTopPlayers;
exports.getContractStatus = getContractStatus;
exports.getPlayerDistribution = getPlayerDistribution;
exports.getRecentOffers = getRecentOffers;
exports.getUpcomingMatches = getUpcomingMatches;
exports.getUrgentTasks = getUrgentTasks;
exports.getRevenueChart = getRevenueChart;
exports.getPerformanceAverages = getPerformanceAverages;
exports.getRecentActivity = getRecentActivity;
exports.getQuickStats = getQuickStats;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const dashboardService = __importStar(require("./dashboard.service"));
// GET /dashboard — full aggregated dashboard
async function getFullDashboard(_req, res) {
    const data = await dashboardService.getFullDashboard();
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/kpis
async function getKpis(_req, res) {
    const data = await dashboardService.getKpis();
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/alerts
async function getAlerts(_req, res) {
    const data = await dashboardService.getAlerts();
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/today
async function getTodayOverview(_req, res) {
    const data = await dashboardService.getTodayOverview();
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/top-players
async function getTopPlayers(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const data = await dashboardService.getTopPlayers(limit);
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/contracts/status
async function getContractStatus(_req, res) {
    const data = await dashboardService.getContractStatusDistribution();
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/players/distribution
async function getPlayerDistribution(_req, res) {
    const data = await dashboardService.getPlayerDistribution();
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/offers/recent
async function getRecentOffers(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const data = await dashboardService.getRecentOffers(limit);
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/matches/upcoming
async function getUpcomingMatches(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const data = await dashboardService.getUpcomingMatches(limit);
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/tasks/urgent
async function getUrgentTasks(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const data = await dashboardService.getUrgentTasks(limit);
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/revenue
async function getRevenueChart(req, res) {
    const months = Math.min(parseInt(req.query.months) || 12, 24);
    const data = await dashboardService.getRevenueChart(months);
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/performance
async function getPerformanceAverages(_req, res) {
    const data = await dashboardService.getPerformanceAverages();
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/activity
async function getRecentActivity(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const data = await dashboardService.getRecentActivity(limit);
    (0, apiResponse_1.sendSuccess)(res, data);
}
// GET /dashboard/quick-stats
async function getQuickStats(_req, res) {
    const data = await dashboardService.getQuickStats();
    (0, apiResponse_1.sendSuccess)(res, data);
}
//# sourceMappingURL=dashboard.controller.js.map