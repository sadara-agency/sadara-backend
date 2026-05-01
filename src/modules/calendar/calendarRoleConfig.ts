import type { UserRole } from "@shared/types";

/**
 * Aggregated event-type strings used in CalendarItem.eventType.
 * Includes both native calendar types and virtual source types.
 */
export type CalendarEventTypeLens =
  | "Training"
  | "Medical"
  | "ContractDeadline"
  | "GateTimeline"
  | "Meeting"
  | "Custom"
  | "Session"
  | "Match"
  | "TaskDeadline"
  | "ReferralDeadline";

/** Sentinel: role sees all event types (no type filtering applied). */
export const ALL_TYPES = "*" as const;

type TypeLens = CalendarEventTypeLens[] | typeof ALL_TYPES;

/**
 * Defines which event types each role should see in their calendar.
 * A role missing from this map gets ALL_TYPES (safe fallback for future roles).
 *
 * Rules:
 * - Privileged roles (Admin/Manager/Executive/SportingDirector) see everything.
 * - Non-privileged roles see only types relevant to their function.
 * - Multi-role users get the union of their roles' lenses.
 */
export const CALENDAR_VISIBLE_TYPES: Partial<Record<UserRole, TypeLens>> = {
  Admin: ALL_TYPES,
  Manager: ALL_TYPES,
  Executive: ALL_TYPES,
  SportingDirector: ALL_TYPES,

  Player: ["Session", "Match", "Medical", "Custom"],
  Scout: ["TaskDeadline", "ReferralDeadline", "Custom"],
  Analyst: ["Match", "Session", "TaskDeadline", "GateTimeline"],
  Legal: ["ContractDeadline", "GateTimeline", "TaskDeadline", "Meeting"],
  Finance: ["ContractDeadline", "TaskDeadline", "Meeting"],
  GraphicDesigner: ["TaskDeadline", "Meeting", "Custom"],

  Coach: ["Session", "Match", "Training", "TaskDeadline", "Medical", "Custom"],
  SkillCoach: ["Session", "Match", "Training", "TaskDeadline"],
  TacticalCoach: ["Session", "Match", "Training", "TaskDeadline"],
  FitnessCoach: ["Session", "Match", "Training", "TaskDeadline", "Medical"],
  GoalkeeperCoach: ["Session", "Match", "Training", "TaskDeadline"],
  GymCoach: ["Session", "Training", "TaskDeadline"],
  NutritionSpecialist: ["Session", "Training", "TaskDeadline", "Medical"],
  MentalCoach: ["Session", "TaskDeadline", "Medical", "Custom"],
};

/**
 * Returns the union of allowed event-type lenses for a set of roles.
 * If any role is privileged (ALL_TYPES), returns ALL_TYPES immediately.
 */
export function resolveTypesForRoles(roles: UserRole[]): TypeLens {
  const types = new Set<CalendarEventTypeLens>();

  for (const role of roles) {
    const lens = CALENDAR_VISIBLE_TYPES[role] ?? ALL_TYPES;
    if (lens === ALL_TYPES) return ALL_TYPES;
    for (const t of lens) types.add(t);
  }

  return types.size > 0
    ? (Array.from(types) as CalendarEventTypeLens[])
    : ALL_TYPES;
}
