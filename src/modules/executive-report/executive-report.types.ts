/**
 * Shared types for the Executive Player Report — a leadership decision brief.
 *
 * The aggregator produces `ExecutiveReportData` (raw + derived facts pulled from
 * existing module services). The narrative engine turns that into bilingual prose
 * + a deterministic recommendation. Both the JSON API payload and the PDF render
 * from these same structures, so there is a single source of truth.
 */

export type ReportLocale = "ar" | "en";

/** Deterministic decision-matrix outcomes (see narrative.decideRecommendation). */
export type RecommendationKey =
  | "RENEW_URGENT_WITH_OFFERS"
  | "RENEW_EARLY_SECURE"
  | "HOLD_AND_MONITOR"
  | "REVIEW_PERFORMANCE_FIRST"
  | "MONITOR";

/** Highest-% improvement metric vs the prior season, when a baseline exists. */
export interface BiggestImprovement {
  /** canonical season-stat field key, e.g. "keyPasses" */
  metric: string;
  /** rounded percentage delta vs prior season, e.g. 38 */
  deltaPct: number;
}

/**
 * Everything the narrative engine needs, already reduced to primitives.
 * Fields that have no baseline are `null` so the narrative can OMIT (never fake)
 * the corresponding sentence.
 */
export interface ExecutiveReportData {
  player: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    age: number | null;
    position: string | null;
    clubNameEn: string | null;
    clubNameAr: string | null;
    marketValue: number | null;
    marketValueCurrency: string;
    /** true when player.status === "injured" */
    injuredFlag: boolean;
  };

  season: {
    /** season label, e.g. "2024-2025" — null if no current-season row */
    label: string | null;
    matchesPlayed: number | null;
    goals: number | null;
    assists: number | null;
    minutesPlayed: number | null;
    /** 0–10 technical rating from latest TechnicalReport.overallScore, null if none */
    rating: number | null;
    /** rating delta vs prior season's report, null if no baseline */
    ratingTrendPct: number | null;
    /** declining performance flag derived from ratingTrendPct < 0 */
    ratingDeclining: boolean;
    /** biggest improvement vs prior season, null if no prior season row */
    biggestImprovement: BiggestImprovement | null;
  };

  contract: {
    /** ISO date string (end_date), null if no active contract */
    endDate: string | null;
    /** whole months from today until endDate, null if no endDate */
    monthsRemaining: number | null;
    salaryCurrency: string | null;
  };

  offers: {
    activeCount: number;
    /** display names of interested clubs (fromClub), de-duplicated */
    interestedClubsEn: string[];
    interestedClubsAr: string[];
  };

  valuation: {
    /** % change current vs earliest valuation this season, null if no baseline */
    changePct: number | null;
    direction: "up" | "down" | "stable" | null;
  };
}

/** The bilingual narrative + the structured recommendation. */
export interface ExecutiveNarrative {
  recommendationKey: RecommendationKey;
  /** number of days to the decisive call, embedded in the recommendation text */
  decisionWindowDays: number;
  seasonSummary: string;
  currentSituation: string;
  recommendation: string;
}

/** Full API payload returned to the frontend. */
export interface ExecutiveReport {
  locale: ReportLocale;
  generatedAt: string;
  data: ExecutiveReportData;
  narrative: ExecutiveNarrative;
}
