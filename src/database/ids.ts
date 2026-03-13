// ─────────────────────────────────────────────────────────────
// src/database/seed/ids.ts
// Fixed UUIDs for consistency across all seed modules.
// ─────────────────────────────────────────────────────────────

function generateIds(prefix: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `${prefix}-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
  );
}

export const IDS = {
  users: {
    admin: "a0000001-0000-0000-0000-000000000001",
    agent: "a0000001-0000-0000-0000-000000000002",
    analyst: "a0000001-0000-0000-0000-000000000003",
    scout: "a0000001-0000-0000-0000-000000000004",
    player: "a0000001-0000-0000-0000-000000000005",
    legal: "a0000001-0000-0000-0000-000000000006",
    finance: "a0000001-0000-0000-0000-000000000007",
    coach: "a0000001-0000-0000-0000-000000000008",
    media: "a0000001-0000-0000-0000-000000000009",
    executive: "a0000001-0000-0000-0000-000000000010",
    // ── Additional staff for auto-task testing ──
    gymCoach: "a0000001-0000-0000-0000-000000000011",
    agent2: "a0000001-0000-0000-0000-000000000012",
    coach2: "a0000001-0000-0000-0000-000000000013",
    analyst2: "a0000001-0000-0000-0000-000000000014",
    scout2: "a0000001-0000-0000-0000-000000000015",
    legal2: "a0000001-0000-0000-0000-000000000016",
    player2: "a0000001-0000-0000-0000-000000000017",
    player3: "a0000001-0000-0000-0000-000000000018",
  },
  clubs: {
    alHilal: "c0000001-0000-0000-0000-000000000001",
    alNassr: "c0000001-0000-0000-0000-000000000002",
    alAhli: "c0000001-0000-0000-0000-000000000003",
    alIttihad: "c0000001-0000-0000-0000-000000000004",
    alShabab: "c0000001-0000-0000-0000-000000000005",
    alFateh: "c0000001-0000-0000-0000-000000000006",
    alTaawoun: "c0000001-0000-0000-0000-000000000007",
    alRaed: "c0000001-0000-0000-0000-000000000008",
  },
  players: generateIds("p0000001", 20),
  contracts: generateIds("ct000001", 12),
  matches: generateIds("m0000001", 8),
  offers: generateIds("of000001", 5),
  tasks: generateIds("tk000001", 8),
  invoices: generateIds("iv000001", 4),
  payments: generateIds("py000001", 6),
  documents: generateIds("dc000001", 5),
  gates: generateIds("gt000001", 4),
  referrals: generateIds("rf000001", 3),
  watchlists: generateIds("wl000001", 3),
  matchPlayers: generateIds("mp000001", 20),
  matchStats: generateIds("ms000001", 20),

  // ── Auto-task test seed IDs ──
  seedContracts: generateIds("sc000001", 4),
  seedInjuries: generateIds("si000001", 4),
  seedOffers: generateIds("so000001", 4),
  seedReferrals: generateIds("sr000001", 3),
  seedDocuments: generateIds("sd000001", 6),
  seedApprovals: generateIds("sa000001", 2),
  seedApprovalSteps: generateIds("ss000001", 3),
  seedWorkoutPlans: generateIds("sw000001", 2),
  seedWorkoutSessions: generateIds("sws00001", 2),
  seedWorkoutAssignments: generateIds("swa00001", 3),
  seedDietPlans: generateIds("sdp00001", 2),
  seedMetricTargets: generateIds("smt00001", 2),
  seedTrainingCourses: generateIds("stc00001", 2),
  seedTrainingEnrollments: generateIds("ste00001", 2),
};
