// ─────────────────────────────────────────────────────────────
// src/modules/players/player.serializer.ts
// Transforms raw Sequelize player rows + enrichment maps
// into the final API response shape (EnrichedPlayerListItem).
//
// Why a separate file?
// - The old code had a 40-line .map() callback that mixed
//   data access (contractMap.get) with business logic
//   (deriveContractInfo) with DTO shaping (return { id, ... }).
// - Now the service just calls `toPlayerListItem(player, maps)`
//   and this file handles the rest.
// - Easy to test: pass a plain player object + maps, assert shape.
// ─────────────────────────────────────────────────────────────
import {
  RawContractRow,
  RawPlayerStatsRow,
  EnrichedPlayerListItem,
} from './player.types';
import { deriveContractInfo, calculatePerformance } from './player.utils';

export interface EnrichmentMaps {
  contractMap: Map<string, RawContractRow>;
  injuryMap: Map<string, number>;
  statsMap: Map<string, RawPlayerStatsRow>;
}

/**
 * Converts a single Sequelize player (plain object) into the
 * enriched list-item DTO that the API returns.
 */
export function toPlayerListItem(
  plainPlayer: any, // Sequelize .get({ plain: true }) result
  maps: EnrichmentMaps,
): EnrichedPlayerListItem {
  const p = plainPlayer;
  const contract = maps.contractMap.get(p.id);
  const stats = maps.statsMap.get(p.id);
  const { contractStatus, contractEnd, commissionRate } = deriveContractInfo(contract);

  const matches = Number(stats?.matches) || 0;
  const goals = Number(stats?.goals) || 0;
  const assists = Number(stats?.assists) || 0;
  const avgRating = Number(stats?.avgRating) || 0;

  const performance = calculatePerformance({ matches, goals, assists, avgRating });

  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    firstNameAr: p.firstNameAr,
    lastNameAr: p.lastNameAr,
    fullName: `${p.firstName} ${p.lastName}`,
    fullNameAr: p.firstNameAr && p.lastNameAr ? `${p.firstNameAr} ${p.lastNameAr}` : null,
    dateOfBirth: p.dateOfBirth,
    nationality: p.nationality,
    playerType: p.playerType,
    position: p.position,
    status: p.status,
    email: p.email,
    phone: p.phone,
    photoUrl: p.photoUrl,
    marketValue: p.marketValue,
    marketValueCurrency: p.marketValueCurrency,
    currentClubId: p.currentClubId,
    club: p.club,
    agent: p.agent,
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
export function toPlayerList(
  plainPlayers: any[],
  maps: EnrichmentMaps,
): EnrichedPlayerListItem[] {
  return plainPlayers.map((p) => toPlayerListItem(p, maps));
}