// ─────────────────────────────────────────────────────────────
// src/modules/players/player.utils.ts
// Pure utility functions extracted from listPlayers.
// Each function does ONE thing and is easy to unit-test.
// ─────────────────────────────────────────────────────────────
import {
  RawContractRow,
  RawInjuryCountRow,
  RawPlayerStatsRow,
  DerivedContractInfo,
  ContractStatusLabel,
} from './player.types';

// ─────────────────────────────────────────────────────
// CONSTANTS
// The "6-month" threshold was a magic number buried
// inside the old map callback. Now it's named and
// importable so tests can reference it too.
// ─────────────────────────────────────────────────────
export const CONTRACT_EXPIRY_WARNING_MONTHS = 6;

// ─────────────────────────────────────────────────────
// deriveContractInfo
// ─────────────────────────────────────────────────────
// Takes an optional raw contract row and returns a
// normalized { contractStatus, contractEnd, commissionRate }
// object. Previously this was 12 lines inside the .map().
// ─────────────────────────────────────────────────────
export function deriveContractInfo(contract?: RawContractRow | null): DerivedContractInfo {
  if (!contract) {
    return { contractStatus: 'Expired', contractEnd: null, commissionRate: 0 };
  }

  const endDate = new Date(contract.endDate);
  const now = new Date();
  const monthsLeft =
    (endDate.getFullYear() - now.getFullYear()) * 12 +
    (endDate.getMonth() - now.getMonth());

  let contractStatus: ContractStatusLabel;
  if (monthsLeft <= 0) {
    contractStatus = 'Expired';
  } else if (monthsLeft <= CONTRACT_EXPIRY_WARNING_MONTHS) {
    contractStatus = 'Expiring Soon';
  } else {
    contractStatus = 'Active';
  }

  return {
    contractStatus,
    contractEnd: contract.endDate,
    commissionRate: contract.agencyCommissionPercent || 0,
  };
}

// ─────────────────────────────────────────────────────
// calculatePerformance
// ─────────────────────────────────────────────────────
// Composite score 0-100 based on goals, assists, and
// average rating relative to matches played.
//
// Formula breakdown:
//   (goals/match * 30) + (assists/match * 20) + (avgRating * 5)
//   clamped to [0, 100]
//
// Previously this was 6 lines inside the .map().
// Now it's testable with simple inputs like:
//   calculatePerformance({ matches: 10, goals: 5, assists: 3, avgRating: 7.2 })
// ─────────────────────────────────────────────────────
export interface PerformanceInput {
  matches: number;
  goals: number;
  assists: number;
  avgRating: number;
}

export function calculatePerformance(input: PerformanceInput): number {
  const { matches, goals, assists, avgRating } = input;

  if (matches <= 0) return 0;

  const raw =
    (goals / matches) * 30 +
    (assists / matches) * 20 +
    avgRating * 5;

  return Math.min(100, Math.max(0, Math.round(raw)));
}

// ─────────────────────────────────────────────────────
// buildContractMap
// ─────────────────────────────────────────────────────
// From a flat array of raw contract rows, builds a Map
// keyed by playerId → latest active contract (by endDate).
//
// Previously this was done inline with a forEach + manual
// date comparison. Extracting it means we can test edge
// cases like multiple active contracts per player.
// ─────────────────────────────────────────────────────
export function buildContractMap(rows: RawContractRow[]): Map<string, RawContractRow> {
  const map = new Map<string, RawContractRow>();

  for (const contract of rows) {
    const existing = map.get(contract.playerId);
    if (!existing || new Date(contract.endDate) > new Date(existing.endDate)) {
      map.set(contract.playerId, contract);
    }
  }

  return map;
}

// ─────────────────────────────────────────────────────
// buildInjuryMap
// ─────────────────────────────────────────────────────
// Converts the raw grouped injury-count rows into a
// simple Map<playerId, number>.
// ─────────────────────────────────────────────────────
export function buildInjuryMap(rows: RawInjuryCountRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.playerId, Number(row.count));
  }
  return map;
}

// ─────────────────────────────────────────────────────
// buildStatsMap
// ─────────────────────────────────────────────────────
// Converts the raw grouped stats rows into a
// Map<playerId, RawPlayerStatsRow>.
// ─────────────────────────────────────────────────────
export function buildStatsMap(rows: RawPlayerStatsRow[]): Map<string, RawPlayerStatsRow> {
  const map = new Map<string, RawPlayerStatsRow>();
  for (const row of rows) {
    map.set(row.playerId, row);
  }
  return map;
}