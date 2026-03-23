// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/wellness.types.ts
// ═══════════════════════════════════════════════════════════════

import type { MacroTargets } from "./wellness.helpers";

export interface WellnessProfileResponse {
  id: string;
  playerId: string;
  sex: "male" | "female";
  activityLevel: number;
  goal: "bulk" | "cut" | "maintenance";
  targetCalories: number | null;
  targetProteinG: number | null;
  targetFatG: number | null;
  targetCarbsG: number | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MacroComputeResponse {
  bmr: number;
  tdee: number;
  macros: MacroTargets;
  bmi: number | null;
  inputs: {
    weightKg: number;
    heightCm: number;
    ageYears: number;
    sex: "male" | "female";
    activityLevel: number;
    goal: "bulk" | "cut" | "maintenance";
  };
}

export interface WeightLogResponse {
  id: string;
  playerId: string;
  weightKg: number;
  bodyFatPct: number | null;
  notes: string | null;
  loggedAt: string;
  createdAt: string;
}

export interface WeightTrendResponse {
  logs: WeightLogResponse[];
  currentBmi: number | null;
  weightChange4Weeks: number | null;
  latestWeight: number | null;
}

// ── Nutrition (Phase 2) ──

export interface FoodItemResponse {
  id: string;
  externalId: string | null;
  source: "nutritionix" | "edamam" | "custom";
  name: string;
  nameAr: string | null;
  brand: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  photoUrl: string | null;
  isVerified: boolean;
}

export interface MealLogResponse {
  id: string;
  playerId: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foodItemId: string | null;
  foodItem?: FoodItemResponse | null;
  customName: string | null;
  servings: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  loggedDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTotalsResponse {
  date: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  mealCount: number;
  calorieAdherencePct: number | null;
  proteinAdherencePct: number | null;
  meals: MealLogResponse[];
}

// ── Fitness (Phase 3) ──

export interface ExerciseResponse {
  id: string;
  name: string;
  nameAr: string | null;
  muscleGroup: string;
  equipment: string;
  videoUrl: string | null;
  videoThumbnail: string | null;
  instructions: string | null;
  instructionsAr: string | null;
  isActive: boolean;
  createdBy: string;
}

export interface TemplateExerciseResponse {
  id: string;
  exerciseId: string;
  exercise?: ExerciseResponse;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  targetWeightKg: number | null;
  restSeconds: number | null;
  notes: string | null;
}

export interface WorkoutTemplateResponse {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  category: string;
  estimatedMinutes: number | null;
  isActive: boolean;
  createdBy: string;
  exercises?: TemplateExerciseResponse[];
}

export interface WorkoutAssignmentResponse {
  id: string;
  playerId: string;
  templateId: string;
  template?: WorkoutTemplateResponse;
  assignedDate: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completedAt: string | null;
  assignedBy: string;
  notes: string | null;
}

export interface WorkoutLogEntry {
  id: string;
  exerciseId: string;
  exercise?: ExerciseResponse;
  setNumber: number;
  actualReps: number | null;
  actualWeightKg: number | null;
  rpe: number | null;
  notes: string | null;
}

export interface AssignmentDetailResponse extends WorkoutAssignmentResponse {
  logs: WorkoutLogEntry[];
  previousWeekLogs?: WorkoutLogEntry[];
}

// ── Dashboard (Phase 4) ──

export interface DailySummaryResponse {
  summaryDate: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  calorieAdherencePct: number | null;
  proteinAdherencePct: number | null;
  workoutCompleted: boolean;
  weightLogged: boolean;
  ringScore: number;
}

export interface PlayerDashboardResponse {
  today: {
    totalCalories: number;
    totalProteinG: number;
    calorieAdherencePct: number | null;
    proteinAdherencePct: number | null;
    workoutCompleted: boolean;
    ringScore: number;
  };
  history: DailySummaryResponse[];
  profile: { targetCalories: number | null; targetProteinG: number | null };
}

export type TrafficLightStatus = "green" | "yellow" | "red";

export interface CoachOverviewPlayer {
  playerId: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  status: TrafficLightStatus;
  avgRingScore: number;
  lastRingScore: number;
  missedWorkouts: number;
  weightChange7d: number | null;
}

export interface CoachOverviewResponse {
  players: CoachOverviewPlayer[];
  summary: { green: number; yellow: number; red: number; total: number };
}
