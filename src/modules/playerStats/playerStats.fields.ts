// Single source of truth for editable season-stat fields and how each is validated.
// "counter" fields must be >= 0 and can only decrease via a flagged correction.
// "percentage" fields must be within [0, 100]. "rate" fields are floats >= 0.
export type StatFieldKind = "counter" | "percentage" | "rate";

export const STAT_FIELD_KINDS: Record<string, StatFieldKind> = {
  matchesPlayed: "counter",
  minutesPlayed: "counter",
  goals: "counter",
  assists: "counter",
  yellowCards: "counter",
  redCards: "counter",
  passCompletionRate: "percentage",
  distanceCovered: "rate",
  cleanSheets: "counter",
  savesMade: "counter",
  savePercentage: "percentage",
  penaltiesSaved: "counter",
  goalsConceded: "counter",
  accurateLongBalls: "counter",
  clearances: "counter",
  tacklesMade: "counter",
  tackleSuccessRate: "percentage",
  interceptions: "counter",
  aerialDuelsWon: "counter",
  blocks: "counter",
  recoveries: "counter",
  totalTouches: "counter",
  passingAccuracy: "percentage",
  keyPasses: "counter",
  chancesCreated: "counter",
  finalThirdPasses: "counter",
  progressiveCarries: "counter",
  ballRecoveries: "counter",
  shotsOnTarget: "counter",
  shotAccuracy: "percentage",
  bigChancesConverted: "counter",
  bigChancesMissed: "counter",
  successfulDribblesRate: "percentage",
  xg: "rate",
  boxTouches: "counter",
};

export const EDITABLE_STAT_FIELDS = Object.keys(STAT_FIELD_KINDS);

export function isEditableStatField(field: string): boolean {
  return field in STAT_FIELD_KINDS;
}
