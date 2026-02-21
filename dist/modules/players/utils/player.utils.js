"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTRACT_EXPIRY_WARNING_MONTHS = void 0;
exports.deriveContractInfo = deriveContractInfo;
exports.calculatePerformance = calculatePerformance;
exports.buildContractMap = buildContractMap;
exports.buildInjuryMap = buildInjuryMap;
exports.buildStatsMap = buildStatsMap;
// ── Constants ──
exports.CONTRACT_EXPIRY_WARNING_MONTHS = 6;
// ── deriveContractInfo ──
function deriveContractInfo(contract) {
    if (!contract) {
        return { contractStatus: 'Expired', contractEnd: null, commissionRate: 0 };
    }
    const endDate = new Date(contract.endDate);
    const now = new Date();
    const monthsLeft = (endDate.getFullYear() - now.getFullYear()) * 12 +
        (endDate.getMonth() - now.getMonth());
    let contractStatus;
    if (monthsLeft <= 0) {
        contractStatus = 'Expired';
    }
    else if (monthsLeft <= exports.CONTRACT_EXPIRY_WARNING_MONTHS) {
        contractStatus = 'Expiring Soon';
    }
    else {
        contractStatus = 'Active';
    }
    return {
        contractStatus,
        contractEnd: contract.endDate,
        commissionRate: Number(contract.commissionPct) || 0, // FIX: was agencyCommissionPercent
    };
}
function calculatePerformance(input) {
    const { matches, goals, assists, avgRating } = input;
    if (matches <= 0)
        return 0;
    const raw = (goals / matches) * 30 +
        (assists / matches) * 20 +
        avgRating * 5;
    return Math.min(100, Math.max(0, Math.round(raw)));
}
// ── buildContractMap ──
function buildContractMap(rows) {
    const map = new Map();
    for (const contract of rows) {
        const existing = map.get(contract.playerId);
        if (!existing || new Date(contract.endDate) > new Date(existing.endDate)) {
            map.set(contract.playerId, contract);
        }
    }
    return map;
}
// ── buildInjuryMap ──
function buildInjuryMap(rows) {
    const map = new Map();
    for (const row of rows) {
        map.set(row.playerId, Number(row.count));
    }
    return map;
}
// ── buildStatsMap ──
function buildStatsMap(rows) {
    const map = new Map();
    for (const row of rows) {
        map.set(row.playerId, row);
    }
    return map;
}
//# sourceMappingURL=player.utils.js.map