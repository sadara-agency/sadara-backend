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
  // NOTE: UUID prefixes must be hex-only (0-9, a-f). 8 chars each.
  players: generateIds("b0000001", 20),
  contracts: generateIds("c1000001", 12),
  matches: generateIds("d0000001", 8),
  offers: generateIds("0f000001", 5),
  tasks: generateIds("e0000001", 8),
  invoices: generateIds("1a000001", 4),
  payments: generateIds("ba000001", 6),
  documents: generateIds("dc000001", 5),
  gates: generateIds("de000001", 4),
  referrals: generateIds("f0000001", 3),
  watchlists: generateIds("f1000001", 3),
  matchPlayers: generateIds("db000001", 20),
  matchStats: generateIds("db100001", 20),

  // ── Auto-task test seed IDs ──
  seedContracts: generateIds("ec000001", 4),
  seedInjuries: generateIds("ec100001", 4),
  seedOffers: generateIds("ec200001", 4),
  seedReferrals: generateIds("ec300001", 3),
  seedDocuments: generateIds("ec400001", 6),
  seedApprovals: generateIds("ec500001", 2),
  seedApprovalSteps: generateIds("ec600001", 3),
  seedWorkoutPlans: generateIds("ec700001", 2),
  seedWorkoutSessions: generateIds("ec800001", 2),
  seedWorkoutAssignments: generateIds("ec900001", 3),
  seedDietPlans: generateIds("eca00001", 2),
  seedMetricTargets: generateIds("ecb00001", 2),
  seedTrainingCourses: generateIds("ecc00001", 2),
  seedTrainingEnrollments: generateIds("ecd00001", 2),
};
