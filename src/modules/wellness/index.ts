// Wellness models
export {
  WellnessProfile,
  WellnessWeightLog,
  WellnessFoodItem,
  WellnessMealLog,
} from "./wellness.model";
export type { WellnessGoal, FoodSource, MealType } from "./wellness.model";

// Fitness models
export {
  WellnessExercise,
  WellnessWorkoutTemplate,
  WellnessTemplateExercise,
  WellnessWorkoutAssignment,
  WellnessDailySummary,
} from "./fitness.model";
export type {
  MuscleGroup,
  Equipment,
  WorkoutCategory,
  AssignmentStatus,
} from "./fitness.model";

// Types
export * from "./wellness.types";

// Services
export * as wellnessService from "./wellness.service";
export * as fitnessService from "./fitness.service";

// Routes
export { default as wellnessRoutes } from "./wellness.routes";
export { default as fitnessRoutes } from "./fitness.routes";
