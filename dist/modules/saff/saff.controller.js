"use strict";
// ─────────────────────────────────────────────────────────────
// src/modules/saff/saff.controller.ts
// ─────────────────────────────────────────────────────────────
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
exports.listTournaments = listTournaments;
exports.seedTournaments = seedTournaments;
exports.fetchFromSaff = fetchFromSaff;
exports.listStandings = listStandings;
exports.listFixtures = listFixtures;
exports.listTeamMaps = listTeamMaps;
exports.mapTeam = mapTeam;
exports.importToSadara = importToSadara;
exports.getStats = getStats;
exports.getSyncStatus = getSyncStatus;
exports.triggerSync = triggerSync;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const saffService = __importStar(require("./saff.service"));
const saff_scheduler_1 = require("./saff.scheduler");
// ── Tournaments ──
async function listTournaments(req, res) {
    const result = await saffService.listTournaments(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
async function seedTournaments(req, res) {
    const count = await saffService.seedTournaments();
    await (0, audit_1.logAudit)('CREATE', 'saff_tournaments', null, (0, audit_1.buildAuditContext)(req.user, req.ip), `Seeded ${count} SAFF tournaments`);
    (0, apiResponse_1.sendSuccess)(res, { count }, `Seeded ${count} new tournaments`);
}
// ── Fetch (Scrape) ──
async function fetchFromSaff(req, res) {
    const result = await saffService.fetchFromSaff(req.body);
    await (0, audit_1.logAudit)('CREATE', 'saff_standings', null, (0, audit_1.buildAuditContext)(req.user, req.ip), `SAFF fetch: ${result.results} tournaments, ${result.standings} standings, ${result.fixtures} fixtures`);
    (0, apiResponse_1.sendSuccess)(res, result, `Fetched data from ${result.results} tournaments`);
}
// ── Standings ──
async function listStandings(req, res) {
    const result = await saffService.listStandings(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
// ── Fixtures ──
async function listFixtures(req, res) {
    const result = await saffService.listFixtures(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
// ── Team Maps ──
async function listTeamMaps(req, res) {
    const result = await saffService.listTeamMaps(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
async function mapTeam(req, res) {
    const result = await saffService.mapTeamToClub(req.body);
    await (0, audit_1.logAudit)('UPDATE', 'saff_team_maps', null, (0, audit_1.buildAuditContext)(req.user, req.ip), `Mapped SAFF team ${req.body.saffTeamId} → club ${req.body.clubId}`);
    (0, apiResponse_1.sendSuccess)(res, result, 'Team mapped successfully');
}
// ── Import ──
async function importToSadara(req, res) {
    const result = await saffService.importToSadara(req.body);
    await (0, audit_1.logAudit)('CREATE', 'clubs', null, (0, audit_1.buildAuditContext)(req.user, req.ip), `SAFF import: ${result.clubs} clubs, ${result.matches} matches`);
    (0, apiResponse_1.sendSuccess)(res, { imported: result }, 'Import completed');
}
// ── Stats ──
async function getStats(req, res) {
    const stats = await saffService.getStats();
    (0, apiResponse_1.sendSuccess)(res, stats);
}
// ── Sync (Scheduler) ──
async function getSyncStatus(req, res) {
    const status = (0, saff_scheduler_1.getSyncStatus)();
    (0, apiResponse_1.sendSuccess)(res, status);
}
async function triggerSync(req, res) {
    const { agencyValues = ['Critical', 'High'], season = '2025-2026' } = req.body;
    // Run in background — don't await
    (0, saff_scheduler_1.runSync)(agencyValues, season, `manual:${req.user.email}`);
    (0, apiResponse_1.sendSuccess)(res, { agencyValues, season }, 'Sync triggered in background');
}
//# sourceMappingURL=saff.controller.js.map