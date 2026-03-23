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
 * Composite ring score (0-100).
 * Weights: calories 40%, protein 30%, workout 30%
 */
export function calculateRingScore(
  calorieAdherencePct: number,
  proteinAdherencePct: number,
  workoutCompleted: boolean,
): number {
  const cal = Math.min(100, Math.max(0, calorieAdherencePct));
  const prot = Math.min(100, Math.max(0, proteinAdherencePct));
  const workout = workoutCompleted ? 100 : 0;
  return Math.round(cal * 0.4 + prot * 0.3 + workout * 0.3);
}
