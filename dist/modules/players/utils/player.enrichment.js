"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEnrichmentMaps = fetchEnrichmentMaps;
// ─────────────────────────────────────────────────────────────
// src/modules/players/player.enrichment.ts
// Batch-fetches contracts, injuries, and stats for player IDs.
//
// FIX: Changed 'agencyCommissionPercent' → 'commissionPct'
// to match the actual contracts table column (commission_pct).
// ─────────────────────────────────────────────────────────────
const sequelize_1 = require("sequelize");
const database_1 = require("../../../config/database");
const player_utils_1 = require("./player.utils");
/**
 * Given an array of player IDs, fires 3 parallel queries and
 * returns lookup Maps for contracts, injuries, and match stats.
 */
async function fetchEnrichmentMaps(playerIds) {
    const Contract = database_1.sequelize.models.Contract;
    const Injury = database_1.sequelize.models.Injury;
    const PlayerMatchStats = database_1.sequelize.models.PlayerMatchStats;
    const playerIdFilter = { [sequelize_1.Op.in]: playerIds };
    const [contractRows, injuryRows, statsRows] = await Promise.all([
        // ── Active contracts (latest per player) ──
        Contract
            ? Contract.findAll({
                where: { playerId: playerIdFilter, status: 'Active' },
                attributes: ['playerId', 'endDate', 'commissionPct'], // FIX: was 'agencyCommissionPercent'
                raw: true,
            })
            : Promise.resolve([]),
        // ── Active injury count per player ──
        Injury
            ? Injury.findAll({
                where: { playerId: playerIdFilter, status: 'UnderTreatment' },
                attributes: ['playerId', [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']],
                group: ['playerId'],
                raw: true,
            })
            : Promise.resolve([]),
        // ── Aggregated match stats per player ──
        PlayerMatchStats
            ? PlayerMatchStats.findAll({
                where: { playerId: playerIdFilter },
                attributes: [
                    'playerId',
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'matches'],
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('goals')), 'goals'],
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('assists')), 'assists'],
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('minutes_played')), 'minutesPlayed'],
                    [(0, sequelize_1.fn)('AVG', (0, sequelize_1.col)('rating')), 'avgRating'],
                ],
                group: ['playerId'],
                raw: true,
            })
            : Promise.resolve([]),
    ]);
    return {
        contractMap: (0, player_utils_1.buildContractMap)(contractRows),
        injuryMap: (0, player_utils_1.buildInjuryMap)(injuryRows),
        statsMap: (0, player_utils_1.buildStatsMap)(statsRows),
    };
}
//# sourceMappingURL=player.enrichment.js.map