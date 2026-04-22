// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/wellness.helpers.ts
// BMR, TDEE, Macro & Ring Score calculators
// ═══════════════════════════════════════════════════════════════

import type { WellnessGoal } from "./wellness.model";

export interface MacroTargets {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/**
 * Mifflin-St Jeor BMR equation (gold standard for athletes).
 * P = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + s
 * where s = +5 for male, -161 for female
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: "male" | "female",
): number {
  const s = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + s;
}

/**
 * Total Daily Energy Expenditure = BMR × activity level multiplier.
 *
 * Activity levels:
 *  1.2   — Sedentary (little/no exercise)
 *  1.375 — Lightly active (1-3 days/week)
 *  1.55  — Moderately active (3-5 days/week)
 *  1.725 — Very active (6-7 days/week)
 *  1.9   — Extra active (athlete / 2× daily training)
 */
export function calculateTDEE(bmr: number, activityLevel: number): number {
  return Math.round(bmr * activityLevel);
}

/**
 * Calculate goal-adjusted macros.
 *
 * Bulk:  TDEE + 400 cal | Protein 2.0g/kg | Fat 22.5% | Carbs = remainder
 * Cut:   TDEE - 400 cal | Protein 2.2g/kg | Fat 22.5% | Carbs = remainder
 * Maint: TDEE           | Protein 2.0g/kg | Fat 22.5% | Carbs = remainder
 */
export function calculateMacros(
  tdee: number,
  weightKg: number,
  goal: WellnessGoal,
): MacroTargets {
  const calorieAdjust = goal === "bulk" ? 400 : goal === "cut" ? -400 : 0;
  const calories = tdee + calorieAdjust;

  const proteinPerKg = goal === "cut" ? 2.2 : 2.0;
  const proteinG = Math.round(weightKg * proteinPerKg * 10) / 10;
  const proteinCal = proteinG * 4;

  const fatCal = calories * 0.225;
  const fatG = Math.round((fatCal / 9) * 10) / 10;

  const carbsCal = Math.max(0, calories - proteinCal - fatCal);
  const carbsG = Math.round((carbsCal / 4) * 10) / 10;

  return { calories, proteinG, fatG, carbsG };
}

/**
 * BMI = weight(kg) / (height(m))²
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Phase 5 ring score (0–100) — computed entirely from the daily pulse checkin.
 * No checkin submitted → returns 0 (player hasn't reported yet today).
 *
 * Weights:
 *   readiness    30% — auto-computed from sleep/fatigue/soreness/mood/stress
 *   sleep        25% — sleepQuality 1-5 scaled to 0-100; null → 50 (neutral)
 *   nutrition    25% — nutritionRating 1-5 scaled; null → 50 (neutral)
 *   training     20% — rest=0, any session type=100; null → 50 (neutral)
 */
export function calculateRingScore(pulse: {
  readinessScore?: number | null;
  sleepQuality?: number | null;
  nutritionRating?: number | null;
  trainingType?: string | null;
}): number {
  const readiness =
    pulse.readinessScore != null
      ? Math.min(100, Math.max(0, pulse.readinessScore))
      : 50;

  const sleep =
    pulse.sleepQuality != null ? ((pulse.sleepQuality - 1) / 4) * 100 : 50;

  const nutrition =
    pulse.nutritionRating != null
      ? ((pulse.nutritionRating - 1) / 4) * 100
      : 50;

  const training =
    pulse.trainingType != null ? (pulse.trainingType === "rest" ? 0 : 100) : 50;

  return Math.round(
    readiness * 0.3 + sleep * 0.25 + nutrition * 0.25 + training * 0.2,
  );
}

/**
 * Calculate readiness score (0-100) from daily checkin responses.
 * Each metric is rated 1-5. Higher values = better except fatigue, soreness, stress
 * where higher = worse (inverted).
 *
 * Components:
 *   sleepQuality (25%) — 1=bad, 5=great
 *   fatigue (20%) — inverted: 1=fresh, 5=exhausted → score = (6 - fatigue)
 *   muscleSoreness (20%) — inverted: 1=none, 5=severe → score = (6 - soreness)
 *   mood (15%) — 1=low, 5=great
 *   stress (10%) — inverted: 1=none, 5=extreme → score = (6 - stress)
 *   sleepHours (10%) — mapped: 7-9h=100, <5h=20, >10h=60
 */
export function calculateReadinessScore(checkin: {
  sleepHours?: number | null;
  sleepQuality?: number | null;
  fatigue?: number | null;
  muscleSoreness?: number | null;
  mood?: number | null;
  stress?: number | null;
}): number {
  const components: { score: number; weight: number }[] = [];

  if (checkin.sleepQuality != null) {
    components.push({
      score: ((checkin.sleepQuality - 1) / 4) * 100,
      weight: 0.25,
    });
  }
  if (checkin.fatigue != null) {
    components.push({ score: ((5 - checkin.fatigue) / 4) * 100, weight: 0.2 });
  }
  if (checkin.muscleSoreness != null) {
    components.push({
      score: ((5 - checkin.muscleSoreness) / 4) * 100,
      weight: 0.2,
    });
  }
  if (checkin.mood != null) {
    components.push({ score: ((checkin.mood - 1) / 4) * 100, weight: 0.15 });
  }
  if (checkin.stress != null) {
    components.push({ score: ((5 - checkin.stress) / 4) * 100, weight: 0.1 });
  }
  if (checkin.sleepHours != null) {
    let sleepScore: number;
    if (checkin.sleepHours >= 7 && checkin.sleepHours <= 9) sleepScore = 100;
    else if (checkin.sleepHours < 5) sleepScore = 20;
    else if (checkin.sleepHours < 7)
      sleepScore = 40 + ((checkin.sleepHours - 5) / 2) * 60;
    else sleepScore = 60; // > 9h (oversleep)
    components.push({ score: sleepScore, weight: 0.1 });
  }

  if (components.length === 0) return 50; // default if no data

  // Normalize weights to sum to 1
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weighted = components.reduce(
    (s, c) => s + c.score * (c.weight / totalWeight),
    0,
  );

  return Math.round(Math.min(100, Math.max(0, weighted)));
}
