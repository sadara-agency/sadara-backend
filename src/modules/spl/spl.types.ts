// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.types.ts
// ─────────────────────────────────────────────────────────────

// ── Scraped from spl.com.sa ──

export interface ScrapedPlayerBio {
  splPlayerId: string;
  slug: string;
  fullName: string;
  jerseyNumber: number | null;
  nationality: string | null;
  position: string | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  photoUrl: string | null;
  pulseLiveId: string | null;
  clubName: string | null;
  splTeamId: string | null;
}

export interface ScrapedSeasonStats {
  season: string;
  appearances: number;
  substitutions: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface ScrapedCareerEntry {
  season: string;
  club: string;
  appearances: number;
  goals: number;
}

export interface ScrapedPlayerFull {
  bio: ScrapedPlayerBio;
  currentSeasonStats: ScrapedSeasonStats | null;
  careerHistory: ScrapedCareerEntry[];
  scrapedAt: Date;
}

// ── Sync Results ──

export interface PlayerSyncResult {
  splPlayerId: string;
  playerName: string;
  sadaraPlayerId: string;
  action: 'created' | 'updated' | 'skipped';
  reason?: string;
}

export interface SplSyncSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: PlayerSyncResult[];
  syncedAt: Date;
  durationMs: number;
}

// ── Club Registry ──

export interface SplClubEntry {
  splTeamId: string;
  splCode: string;
  espnTeamId: string;
  nameEn: string;
  nameAr: string;
  city: string;
}