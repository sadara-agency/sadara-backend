import type { UserRole } from "@shared/types";
import type { SessionType, ProgramOwner } from "./session.model";

export interface SessionRoleDefault {
  sessionType: SessionType;
  programOwner: ProgramOwner;
}

// Staff roles whose sessions are inherently tied to a single discipline.
// When a member of one of these roles creates a session, the session type and
// program owner are forced to these values (only Admin/Manager keep manual control).
// Roles not listed here (Admin, Manager, Scout, Legal, Finance, ...) → no forced default.
export const SESSION_ROLE_CONFIG: Partial<
  Record<UserRole, SessionRoleDefault>
> = {
  Coach: { sessionType: "Physical", programOwner: "Coach" },
  FitnessCoach: { sessionType: "Physical", programOwner: "FitnessCoach" },
  GymCoach: { sessionType: "Physical", programOwner: "FitnessCoach" },
  SkillCoach: { sessionType: "Skill", programOwner: "SkillCoach" },
  TacticalCoach: { sessionType: "Tactical", programOwner: "TacticalCoach" },
  GoalkeeperCoach: {
    sessionType: "Goalkeeper",
    programOwner: "GoalkeeperCoach",
  },
  MentalCoach: { sessionType: "Mental", programOwner: "MentalCoach" },
  NutritionSpecialist: {
    sessionType: "Nutrition",
    programOwner: "NutritionSpecialist",
  },
  Analyst: {
    sessionType: "PerformanceAssessment",
    programOwner: "Analyst",
  },
};

export function isAdminLevelRole(role: UserRole): boolean {
  return role === "Admin" || role === "Manager";
}
