// ─────────────────────────────────────────────────────────────
// All TypeScript interfaces for the player module in one place.
// Replaces every `any` that was scattered across the service.
// ─────────────────────────────────────────────────────────────

// ── Query params that the controller forwards from req.query ──
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

// ── What the batch-fetched contract row looks like (raw: true) ──
export interface RawContractRow {
  playerId: string;
  endDate: string;
  agencyCommissionPercent: number | null;
}

// ── What the batch-fetched injury count row looks like (raw: true) ──
export interface RawInjuryCountRow {
  playerId: string;
  count: string; // Sequelize COUNT returns string in raw mode
}

// ── What the batch-fetched stats row looks like (raw: true) ──
export interface RawPlayerStatsRow {
  playerId: string;
  matches: string;
  goals: string;
  assists: string;
  minutesPlayed: string;
  avgRating: string;
}

// ── Derived contract status after business-logic evaluation ──
export type ContractStatusLabel = 'Active' | 'Expiring Soon' | 'Expired';

export interface DerivedContractInfo {
  contractStatus: ContractStatusLabel;
  contractEnd: string | null;
  commissionRate: number;
}

// ── The final shape of each player in the API response ──
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