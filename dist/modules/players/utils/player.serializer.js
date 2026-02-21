"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPlayerListItem = toPlayerListItem;
exports.toPlayerList = toPlayerList;
const player_utils_1 = require("./player.utils");
/**
 * Compute age from a date-of-birth string.
 */
function computeAge(dob) {
    if (!dob)
        return 0;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}
/**
 * Generate 2-character initials from Arabic or English name.
 */
function getInitials(firstNameAr, lastNameAr, firstName, lastName) {
    if (firstNameAr && lastNameAr) {
        return `${firstNameAr.charAt(0)}${lastNameAr.charAt(0)}`;
    }
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
/**
 * Converts a single Sequelize player (plain object) into the
 * enriched list-item DTO that the API returns.
 */
function toPlayerListItem(plainPlayer, maps) {
    const p = plainPlayer;
    const contract = maps.contractMap.get(p.id);
    const stats = maps.statsMap.get(p.id);
    const { contractStatus, contractEnd, commissionRate } = (0, player_utils_1.deriveContractInfo)(contract);
    const matches = Number(stats?.matches) || 0;
    const goals = Number(stats?.goals) || 0;
    const assists = Number(stats?.assists) || 0;
    const avgRating = Number(stats?.avgRating) || 0;
    const performance = (0, player_utils_1.calculatePerformance)({ matches, goals, assists, avgRating });
    return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        firstNameAr: p.firstNameAr,
        lastNameAr: p.lastNameAr,
        fullName: `${p.firstName} ${p.lastName}`,
        fullNameAr: p.firstNameAr && p.lastNameAr ? `${p.firstNameAr} ${p.lastNameAr}` : null,
        // ── Flat convenience fields for the frontend ──
        name: p.firstNameAr && p.lastNameAr
            ? `${p.firstNameAr} ${p.lastNameAr}`
            : `${p.firstName} ${p.lastName}`,
        initials: getInitials(p.firstNameAr, p.lastNameAr, p.firstName, p.lastName),
        age: computeAge(p.dateOfBirth),
        dateOfBirth: p.dateOfBirth,
        nationality: p.nationality,
        playerType: p.playerType,
        position: p.position,
        status: p.status,
        email: p.email,
        phone: p.phone,
        photoUrl: p.photoUrl,
        marketValue: p.marketValue ? Number(p.marketValue) : 0,
        marketValueCurrency: p.marketValueCurrency,
        currentClubId: p.currentClubId,
        // ── Club: nested object + flat string ──
        club: p.club ? p.club.nameAr || p.club.name : null,
        clubData: p.club, // rich object for detail pages
        // ── Agent: nested object + flat string ──
        agent: p.agent ? p.agent.fullNameAr || p.agent.fullName : null,
        agentData: p.agent,
        // ── Enriched fields ──
        contractStatus,
        contractEnd,
        commissionRate,
        activeInjuries: maps.injuryMap.get(p.id) || 0,
        matches,
        goals,
        assists,
        minutesPlayed: Number(stats?.minutesPlayed) || 0,
        rating: avgRating ? parseFloat(avgRating.toFixed(1)) : 0,
        performance,
        createdAt: p.createdAt,
    };
}
/**
 * Batch version — maps an array of plain players through toPlayerListItem.
 */
function toPlayerList(plainPlayers, maps) {
    return plainPlayers.map((p) => toPlayerListItem(p, maps));
}
//# sourceMappingURL=player.serializer.js.map