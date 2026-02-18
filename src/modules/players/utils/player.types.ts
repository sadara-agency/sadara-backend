// ─────────────────────────────────────────────────────────────
// src/modules/players/player.types.ts
// All TypeScript interfaces for the player module.
// ─────────────────────────────────────────────────────────────

// ── Query params from req.query ──
export interface ListPlayersQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: 'active' | 'injured' | 'inactive';
  playerType?: 'Pro' | 'Youth';
  clubId?: string;
  position?: string;
  nationality?: string;
}

// ── Batch-fetched contract row (raw: true) ──
// FIX: was `agencyCommissionPercent` which doesn't exist in DB.
// The actual column is `commission_pct` → Sequelize camelCase: `commissionPct`
export interface RawContractRow {
  playerId: string;
  endDate: string;
  commissionPct: number | null;
}

// ── Batch-fetched injury count row (raw: true) ──
export interface RawInjuryCountRow {
  playerId: string;
  count: string; // Sequelize COUNT returns string in raw mode
}

// ── Batch-fetched stats row (raw: true) ──
export interface RawPlayerStatsRow {
  playerId: string;
  matches: string;
  goals: string;
  assists: string;
  minutesPlayed: string;
  avgRating: string;
}

// ── Derived contract status ──
export type ContractStatusLabel = 'Active' | 'Expiring Soon' | 'Expired';

export interface DerivedContractInfo {
  contractStatus: ContractStatusLabel;
  contractEnd: string | null;
  commissionRate: number;
}

// ── Final shape of each player in the API response ──
export interface EnrichedPlayerListItem {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  fullName: string;
  fullNameAr: string | null;
  dateOfBirth: string;
  nationality: string | null;
  playerType: 'Pro' | 'Youth';
  position: string | null;
  status: 'active' | 'injured' | 'inactive';
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  marketValue: number | null;
  marketValueCurrency: 'SAR' | 'USD' | 'EUR';
  currentClubId: string | null;
  club: { id: string; name: string; nameAr?: string; logoUrl?: string; league?: string } | null;
  agent: { id: string; fullName: string; fullNameAr?: string } | null;

  // Enriched fields
  contractStatus: ContractStatusLabel;
  contractEnd: string | null;
  commissionRate: number;
  activeInjuries: number;
  matches: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  rating: number;
  performance: number;
  createdAt: Date;
}