import { z } from "zod";

export const POSITION_TEMPLATES = [
  "Goalkeeper",
  "CenterBack",
  "FullBack",
  "Wingback",
  "DefMid",
  "CenMid",
  "AttMid",
  "Winger",
  "Striker",
] as const;

export type PositionTemplate = (typeof POSITION_TEMPLATES)[number];

export const positionTemplateSchema = z.enum(POSITION_TEMPLATES);

export const RATING_KEYS = [
  "pace",
  "strength",
  "stamina",
  "ballControl",
  "passing",
  "shooting",
  "defending",
  "decisionMaking",
  "leadership",
  "workRate",
  "positioning",
  "pressingScore",
  "tacticalAwareness",
  "composure",
  "resilience",
  "teamFit",
  "communication",
  "coachability",
  "offFieldConduct",
] as const;

export type RatingKey = (typeof RATING_KEYS)[number];

export type RatingsLike = Partial<Record<RatingKey, number | null | undefined>>;

// Weights are percentage points × 100 — each column sums to 100.
// Renormalized at compute time over the subset of provided ratings.
const WEIGHTS: Record<PositionTemplate, Record<RatingKey, number>> = {
  Goalkeeper: {
    pace: 0,
    strength: 4,
    stamina: 0,
    ballControl: 0,
    passing: 4,
    shooting: 0,
    defending: 4,
    decisionMaking: 11,
    leadership: 8,
    workRate: 4,
    positioning: 14,
    pressingScore: 0,
    tacticalAwareness: 11,
    composure: 14,
    resilience: 11,
    teamFit: 5,
    communication: 5,
    coachability: 3,
    offFieldConduct: 2,
  },
  CenterBack: {
    pace: 4,
    strength: 10,
    stamina: 5,
    ballControl: 5,
    passing: 7,
    shooting: 0,
    defending: 14,
    decisionMaking: 8,
    leadership: 7,
    workRate: 6,
    positioning: 9,
    pressingScore: 5,
    tacticalAwareness: 9,
    composure: 5,
    resilience: 4,
    teamFit: 3,
    communication: 4,
    coachability: 2,
    offFieldConduct: 2,
  },
  FullBack: {
    pace: 9,
    strength: 5,
    stamina: 8,
    ballControl: 6,
    passing: 7,
    shooting: 0,
    defending: 11,
    decisionMaking: 6,
    leadership: 4,
    workRate: 9,
    positioning: 7,
    pressingScore: 7,
    tacticalAwareness: 6,
    composure: 4,
    resilience: 4,
    teamFit: 3,
    communication: 2,
    coachability: 2,
    offFieldConduct: 1,
  },
  Wingback: {
    pace: 9,
    strength: 5,
    stamina: 9,
    ballControl: 7,
    passing: 7,
    shooting: 0,
    defending: 8,
    decisionMaking: 6,
    leadership: 4,
    workRate: 10,
    positioning: 6,
    pressingScore: 8,
    tacticalAwareness: 6,
    composure: 4,
    resilience: 4,
    teamFit: 3,
    communication: 2,
    coachability: 2,
    offFieldConduct: 1,
  },
  DefMid: {
    pace: 4,
    strength: 6,
    stamina: 8,
    ballControl: 7,
    passing: 9,
    shooting: 0,
    defending: 12,
    decisionMaking: 9,
    leadership: 5,
    workRate: 9,
    positioning: 8,
    pressingScore: 9,
    tacticalAwareness: 9,
    composure: 4,
    resilience: 4,
    teamFit: 3,
    communication: 2,
    coachability: 2,
    offFieldConduct: 1,
  },
  CenMid: {
    pace: 5,
    strength: 5,
    stamina: 9,
    ballControl: 9,
    passing: 11,
    shooting: 4,
    defending: 7,
    decisionMaking: 9,
    leadership: 5,
    workRate: 8,
    positioning: 6,
    pressingScore: 7,
    tacticalAwareness: 9,
    composure: 4,
    resilience: 4,
    teamFit: 3,
    communication: 2,
    coachability: 2,
    offFieldConduct: 1,
  },
  AttMid: {
    pace: 5,
    strength: 4,
    stamina: 7,
    ballControl: 11,
    passing: 10,
    shooting: 8,
    defending: 3,
    decisionMaking: 10,
    leadership: 4,
    workRate: 7,
    positioning: 6,
    pressingScore: 6,
    tacticalAwareness: 9,
    composure: 5,
    resilience: 3,
    teamFit: 3,
    communication: 2,
    coachability: 2,
    offFieldConduct: 1,
  },
  Winger: {
    pace: 11,
    strength: 4,
    stamina: 9,
    ballControl: 11,
    passing: 6,
    shooting: 8,
    defending: 3,
    decisionMaking: 7,
    leadership: 3,
    workRate: 9,
    positioning: 5,
    pressingScore: 9,
    tacticalAwareness: 6,
    composure: 4,
    resilience: 3,
    teamFit: 3,
    communication: 1,
    coachability: 1,
    offFieldConduct: 1,
  },
  Striker: {
    pace: 9,
    strength: 8,
    stamina: 5,
    ballControl: 9,
    passing: 5,
    shooting: 14,
    defending: 0,
    decisionMaking: 7,
    leadership: 3,
    workRate: 6,
    positioning: 7,
    pressingScore: 6,
    tacticalAwareness: 6,
    composure: 7,
    resilience: 4,
    teamFit: 3,
    communication: 1,
    coachability: 1,
    offFieldConduct: 1,
  },
};

/**
 * Map a freeform position string (English or Arabic) to a closed PositionTemplate.
 * Returns null when no confident match is found — caller should fall back to flat mean.
 */
export function freeformToTemplate(
  position: string | null | undefined,
): PositionTemplate | null {
  if (!position) return null;
  const s = position.trim().toLowerCase();
  if (!s) return null;

  // Goalkeeper — check first (substring match could otherwise be eaten by "back")
  if (/\bgk\b|goalkeep|keeper|portero/.test(s) || s.includes("حارس")) {
    return "Goalkeeper";
  }

  // Wingback (must precede FullBack — "wing back" contains "back")
  if (/\bwb\b|\blwb\b|\brwb\b|wing[- ]?back/.test(s)) {
    return "Wingback";
  }

  // FullBack
  if (
    /\bfb\b|\blb\b|\brb\b|full[- ]?back|left[- ]?back|right[- ]?back/.test(s) ||
    s.includes("ظهير")
  ) {
    return "FullBack";
  }

  // CenterBack
  if (
    /\bcb\b|cent(er|re)[- ]?back|central defender|centre[- ]?half/.test(s) ||
    /(^|\s)مدافع(\s|$)/.test(s) ||
    s.includes("مدافع وسط") ||
    s.includes("قلب الدفاع")
  ) {
    return "CenterBack";
  }

  // DefMid
  if (
    /\bdm\b|\bcdm\b|defensive mid|holding mid|anchor/.test(s) ||
    s.includes("ارتكاز")
  ) {
    return "DefMid";
  }

  // AttMid
  if (
    /\bam\b|\bcam\b|attacking mid|playmaker|number 10|no\.?\s*10/.test(s) ||
    s.includes("صانع ألعاب") ||
    s.includes("صانع العاب")
  ) {
    return "AttMid";
  }

  // Winger
  if (
    /\blw\b|\brw\b|\blm\b|\brm\b|winger|wide forward|wide midfielder/.test(s) ||
    /(^|\s)جناح(\s|$)/.test(s)
  ) {
    return "Winger";
  }

  // Striker
  if (
    /\bst\b|\bcf\b|striker|cent(er|re) forward|forward(?!s? line)|main forward/.test(
      s,
    ) ||
    s.includes("مهاجم") ||
    s.includes("رأس حربة")
  ) {
    return "Striker";
  }

  // CenMid (catch-all for generic midfield)
  if (
    /\bcm\b|midfield|box[- ]?to[- ]?box|central mid/.test(s) ||
    s.includes("وسط")
  ) {
    return "CenMid";
  }

  return null;
}

/**
 * Compute the role-weighted overall score from a partial set of ratings.
 *
 * Weights are renormalized over only the *provided* (non-null) ratings, so a
 * partial report still produces a coherent score from the subset of traits
 * the scout chose to rate.
 *
 * Falls back to a flat mean when template is null — preserves legacy behavior
 * for prospects whose freeform position string can't be resolved.
 *
 * Returns null when no ratings are present at all.
 */
export function computeWeightedOverall(
  ratings: RatingsLike,
  template: PositionTemplate | null,
): number | null {
  const provided: { key: RatingKey; value: number }[] = [];
  for (const key of RATING_KEYS) {
    const v = ratings[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      provided.push({ key, value: v });
    }
  }
  if (provided.length === 0) return null;

  if (template === null) {
    const mean =
      provided.reduce((acc, r) => acc + r.value, 0) / provided.length;
    return parseFloat(mean.toFixed(2));
  }

  const weights = WEIGHTS[template];
  let weightedSum = 0;
  let weightTotal = 0;
  for (const { key, value } of provided) {
    const w = weights[key];
    if (w > 0) {
      weightedSum += w * value;
      weightTotal += w;
    }
  }

  // If none of the provided ratings carry weight under this template (e.g., a
  // GK report with only field-player traits scored), fall back to flat mean
  // rather than returning 0.
  if (weightTotal === 0) {
    const mean =
      provided.reduce((acc, r) => acc + r.value, 0) / provided.length;
    return parseFloat(mean.toFixed(2));
  }

  return parseFloat((weightedSum / weightTotal).toFixed(2));
}
