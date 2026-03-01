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
exports.list = list;
exports.getById = getById;
exports.upcoming = upcoming;
exports.create = create;
exports.update = update;
exports.updateScore = updateScore;
exports.updateStatus = updateStatus;
exports.remove = remove;
exports.calendar = calendar;
exports.getPlayers = getPlayers;
exports.assignPlayers = assignPlayers;
exports.updatePlayer = updatePlayer;
exports.removePlayer = removePlayer;
exports.getStats = getStats;
exports.upsertStats = upsertStats;
exports.updatePlayerStats = updatePlayerStats;
exports.deletePlayerStats = deletePlayerStats;
exports.playerMatches = playerMatches;
exports.playerAggregateStats = playerAggregateStats;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const svc = __importStar(require("./match.service"));
const matchAutoTasks_1 = require("./matchAutoTasks");
// ═══════════════════════════════════════════════════════════════
//  MATCH CRUD
// ═══════════════════════════════════════════════════════════════
async function list(req, res) {
    const result = await svc.listMatches(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
async function getById(req, res) {
    const match = await svc.getMatchById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, match);
}
async function upcoming(req, res) {
    const days = Number(req.query.days) || 7;
    const limit = Number(req.query.limit) || 10;
    const matches = await svc.getUpcomingMatches(days, limit);
    (0, apiResponse_1.sendSuccess)(res, matches);
}
async function create(req, res) {
    const match = await svc.createMatch(req.body);
    await (0, audit_1.logAudit)('CREATE', 'matches', match.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Created match: ${match.competition || 'Match'} on ${match.matchDate}`);
    (0, apiResponse_1.sendCreated)(res, match);
}
async function update(req, res) {
    const match = await svc.updateMatch(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'matches', match.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated match ${match.id}`);
    (0, apiResponse_1.sendSuccess)(res, match, 'Match updated');
}
async function updateScore(req, res) {
    const match = await svc.updateScore(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'matches', match.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Score updated: ${match.homeScore}-${match.awayScore}`);
    (0, apiResponse_1.sendSuccess)(res, match, 'Score updated');
}
async function updateStatus(req, res) {
    const match = await svc.updateMatchStatus(req.params.id, req.body.status);
    await (0, audit_1.logAudit)('UPDATE', 'matches', match.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Match status changed to ${match.status}`);
    // ── Auto-generate tasks when match is completed ──
    if (req.body.status === 'completed') {
        (0, matchAutoTasks_1.generateAutoTasks)(req.params.id, req.user.id)
            .then(result => {
            if (result.created > 0) {
                console.log(`[AutoTasks] Match completed → Created ${result.created} tasks for match ${req.params.id}`);
            }
        })
            .catch(err => {
            console.error('[AutoTasks] Error on match completion:', err.message);
        });
    }
    (0, apiResponse_1.sendSuccess)(res, match, `Match status updated to ${match.status}`);
}
async function remove(req, res) {
    const result = await svc.deleteMatch(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'matches', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Match deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Match deleted');
}
// ═══════════════════════════════════════════════════════════════
//  CALENDAR
// ═══════════════════════════════════════════════════════════════
async function calendar(req, res) {
    const matches = await svc.getCalendar(req.query);
    (0, apiResponse_1.sendSuccess)(res, matches);
}
// ═══════════════════════════════════════════════════════════════
//  MATCH PLAYERS
// ═══════════════════════════════════════════════════════════════
async function getPlayers(req, res) {
    const players = await svc.getMatchPlayers(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, players);
}
async function assignPlayers(req, res) {
    const players = await svc.assignPlayers(req.params.id, req.body.players);
    await (0, audit_1.logAudit)('UPDATE', 'matches', req.params.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Assigned ${req.body.players.length} players to match`);
    (0, apiResponse_1.sendSuccess)(res, players, 'Players assigned');
}
async function updatePlayer(req, res) {
    const mp = await svc.updateMatchPlayer(req.params.id, req.params.playerId, req.body);
    (0, apiResponse_1.sendSuccess)(res, mp, 'Player assignment updated');
}
async function removePlayer(req, res) {
    const result = await svc.removePlayerFromMatch(req.params.id, req.params.playerId);
    await (0, audit_1.logAudit)('DELETE', 'matches', req.params.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Removed player ${req.params.playerId} from match`);
    (0, apiResponse_1.sendSuccess)(res, result, 'Player removed from match');
}
// ═══════════════════════════════════════════════════════════════
//  PLAYER MATCH STATS
// ═══════════════════════════════════════════════════════════════
async function getStats(req, res) {
    const stats = await svc.getMatchStats(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, stats);
}
async function upsertStats(req, res) {
    const stats = await svc.upsertStats(req.params.id, req.body.stats);
    await (0, audit_1.logAudit)('UPDATE', 'matches', req.params.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated stats for ${req.body.stats.length} players`);
    // ── Auto-generate tasks based on stats (fire-and-forget) ──
    (0, matchAutoTasks_1.generateAutoTasks)(req.params.id, req.user.id)
        .then(result => {
        if (result.created > 0) {
            console.log(`[AutoTasks] Created ${result.created} tasks for match ${req.params.id}: ${result.rules.join(', ')}`);
        }
    })
        .catch(err => {
        console.error('[AutoTasks] Error generating auto-tasks:', err.message);
    });
    (0, apiResponse_1.sendSuccess)(res, stats, 'Stats saved');
}
async function updatePlayerStats(req, res) {
    const stats = await svc.updatePlayerStats(req.params.id, req.params.playerId, req.body);
    (0, apiResponse_1.sendSuccess)(res, stats, 'Player stats updated');
}
async function deletePlayerStats(req, res) {
    const result = await svc.deletePlayerStats(req.params.id, req.params.playerId);
    (0, apiResponse_1.sendSuccess)(res, result, 'Player stats deleted');
}
// ═══════════════════════════════════════════════════════════════
//  PLAYER-CENTRIC (for player profile)
// ═══════════════════════════════════════════════════════════════
async function playerMatches(req, res) {
    const result = await svc.getPlayerMatches(req.params.playerId, req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
async function playerAggregateStats(req, res) {
    const stats = await svc.getPlayerAggregateStats(req.params.playerId, req.query);
    (0, apiResponse_1.sendSuccess)(res, stats);
}
//# sourceMappingURL=match.controller.js.map