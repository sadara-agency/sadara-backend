export interface AssignedPlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  photoUrl: string | null;
  position: string | null;
  nationality: string | null;
  heightCm: number | null;
  weightKg: number | null;
  dateOfBirth: string | null;
  overallTacticalScore: number | null;
  lastKpiDate: string | null;
}

export interface RecentMatchStatRow {
  matchId: string;
  matchDate: string;
  homeClubId: string | null;
  awayClubId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  minutesPlayed: number | null;
  goals: number | null;
  assists: number | null;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  passesTotal: number | null;
  passesCompleted: number | null;
  tacklesTotal: number | null;
  interceptions: number | null;
  duelsWon: number | null;
  duelsTotal: number | null;
  keyPasses: number | null;
  xg: number | null;
  xa: number | null;
  progressivePasses: number | null;
  yellowCards: number | null;
  redCards: number | null;
  rating: number | null;
  positionInMatch: string | null;
}

export interface PlayerProfileResponse {
  player: AssignedPlayerRow;
  recentMatchStats: RecentMatchStatRow[];
  seasonStats: Record<string, unknown>[];
  kpiTrend: Record<string, unknown>[];
  activeEvolutionCycle: Record<string, unknown> | null;
}

export interface ComparePlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  photoUrl: string | null;
  position: string | null;
  seasonStats: Record<string, unknown> | null;
  lastKpi: Record<string, unknown> | null;
  recentMatchAvg: {
    avgGoals: number;
    avgAssists: number;
    avgRating: number;
    avgXg: number;
    avgMinutesPlayed: number;
    matchCount: number;
  };
}
