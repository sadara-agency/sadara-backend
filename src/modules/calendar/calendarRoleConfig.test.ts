import {
  resolveTypesForRoles,
  CALENDAR_VISIBLE_TYPES,
  ALL_TYPES,
} from "./calendarRoleConfig";
import type { UserRole } from "@shared/types";

describe("resolveTypesForRoles", () => {
  it("returns ALL_TYPES for Admin", () => {
    expect(resolveTypesForRoles(["Admin"])).toBe(ALL_TYPES);
  });

  it("returns ALL_TYPES for Manager", () => {
    expect(resolveTypesForRoles(["Manager"])).toBe(ALL_TYPES);
  });

  it("returns ALL_TYPES for Executive", () => {
    expect(resolveTypesForRoles(["Executive"])).toBe(ALL_TYPES);
  });

  it("returns ALL_TYPES when one of multiple roles is privileged", () => {
    expect(resolveTypesForRoles(["Coach", "Admin"])).toBe(ALL_TYPES);
  });

  it("returns Session and Match for Coach", () => {
    const lens = resolveTypesForRoles(["Coach"]);
    expect(Array.isArray(lens)).toBe(true);
    expect(lens).toContain("Session");
    expect(lens).toContain("Match");
    expect(lens).not.toContain("ContractDeadline");
  });

  it("returns TaskDeadline and ReferralDeadline for Scout", () => {
    const lens = resolveTypesForRoles(["Scout"]);
    expect(lens).toContain("TaskDeadline");
    expect(lens).toContain("ReferralDeadline");
    expect(lens).not.toContain("Session");
  });

  it("returns ContractDeadline and GateTimeline for Legal", () => {
    const lens = resolveTypesForRoles(["Legal"]);
    expect(lens).toContain("ContractDeadline");
    expect(lens).toContain("GateTimeline");
  });

  it("returns union of types for multi-role (Coach + Analyst)", () => {
    const lens = resolveTypesForRoles(["Coach", "Analyst"]);
    expect(Array.isArray(lens)).toBe(true);
    // Coach brings Session, Match, Training; Analyst brings GateTimeline
    expect(lens).toContain("Session");
    expect(lens).toContain("Match");
    expect(lens).toContain("GateTimeline");
  });

  it("returns Session for Player", () => {
    const lens = resolveTypesForRoles(["Player"]);
    expect(lens).toContain("Session");
    expect(lens).toContain("Match");
    expect(lens).not.toContain("TaskDeadline");
  });

  it("returns ContractDeadline for Finance", () => {
    const lens = resolveTypesForRoles(["Finance"]);
    expect(lens).toContain("ContractDeadline");
    expect(lens).not.toContain("Session");
  });

  it("falls back to ALL_TYPES for unknown role", () => {
    expect(resolveTypesForRoles(["UnknownRole" as UserRole])).toBe(ALL_TYPES);
  });
});
