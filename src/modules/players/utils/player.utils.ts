// ─────────────────────────────────────────────────────────────
// src/modules/players/player.utils.ts
// Pure utility functions for the player module.
//
// FIX: deriveContractInfo now uses `contract.commissionPct`
// instead of `contract.agencyCommissionPercent`.
// ─────────────────────────────────────────────────────────────
import {
  RawContractRow,
  RawInjuryCountRow,
  RawPlayerStatsRow,
  DerivedContractInfo,
  ContractStatusLabel,
} from './player.types';

// ── Constants ──
export const CONTRACT_EXPIRY_WARNING_MONTHS = 6;

// ── deriveContractInfo ──
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
    commissionRate: Number(contract.commissionPct) || 0,  // FIX: was agencyCommissionPercent
  };
}

// ── calculatePerformance ──
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

// ── buildContractMap ──
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

// ── buildInjuryMap ──
export function buildInjuryMap(rows: RawInjuryCountRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.playerId, Number(row.count));
  }
  return map;
}

// ── buildStatsMap ──
export function buildStatsMap(rows: RawPlayerStatsRow[]): Map<string, RawPlayerStatsRow> {
  const map = new Map<string, RawPlayerStatsRow>();
  for (const row of rows) {
    map.set(row.playerId, row);
  }
  return map;
}