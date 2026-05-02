// ─────────────────────────────────────────────────────────────
// src/database/seed-shared.ts
// Shared seed functions used by BOTH dev seed and production
// seed: permissions matrix + approval chain templates.
// ─────────────────────────────────────────────────────────────
import { logger } from "@config/logger";
import { RolePermission } from "@modules/permissions/permission.model";
import {
  ApprovalChainTemplate,
  ApprovalChainTemplateStep,
} from "@modules/approvals/approvalChainTemplate.model";
import { PackageConfig } from "@modules/packages/packageConfig.model";

// ═════════════════════════════════════════════════════════════
// PERMISSIONS DATA
// ═════════════════════════════════════════════════════════════

interface Perm {
  role: string;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export const ALL_ROLES = [
  "Admin",
  "Manager",
  "Analyst",
  "Scout",
  "Player",
  "Legal",
  "Finance",
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
  "GraphicDesigner",
  "Executive",
  "GoalkeeperCoach",
  "MentalCoach",
  "SportingDirector",
];

export function allRoles(module: string, flags: Partial<Perm>): Perm[] {
  return ALL_ROLES.map((role) => ({
    role,
    module,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
    ...flags,
  }));
}

export function forRoles(
  module: string,
  roles: string[],
  flags: Partial<Perm>,
): Perm[] {
  return roles.map((role) => ({
    role,
    module,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
    ...flags,
  }));
}

const RAW_PERMISSIONS: Perm[] = [
  ...allRoles("dashboard", { canRead: true }),

  ...allRoles("players", { canRead: true }),
  ...forRoles("players", ["Admin"], {
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("players", ["Manager"], { canCreate: true, canUpdate: true }),

  ...forRoles("clubs", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("clubs", ["Manager"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles(
    "clubs",
    [
      "Analyst",
      "Scout",
      "Coach",
      "SkillCoach",
      "TacticalCoach",
      "FitnessCoach",
      "NutritionSpecialist",
      "GymCoach",
      "GoalkeeperCoach",
      "MentalCoach",
      "Finance",
      "Legal",
      "GraphicDesigner",
      "Executive",
    ],
    { canRead: true },
  ),

  ...forRoles("matches", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("matches", ["Manager", "Coach", "TacticalCoach"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("matches", ["SkillCoach"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("matches", ["FitnessCoach"], { canRead: true }),
  ...forRoles("matches", ["Analyst"], { canRead: true, canUpdate: true }),
  ...forRoles("matches", ["Scout", "Player", "GraphicDesigner", "Executive"], {
    canRead: true,
  }),

  ...forRoles("contracts", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("contracts", ["Manager", "Legal"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("contracts", ["Finance", "Executive", "Analyst"], {
    canRead: true,
  }),

  ...forRoles("offers", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("offers", ["Manager"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("offers", ["Legal", "Finance", "Executive", "Analyst"], {
    canRead: true,
  }),

  ...forRoles("gates", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("gates", ["Manager"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("gates", ["Analyst"], { canRead: true, canUpdate: true }),
  ...forRoles("gates", ["Legal", "Executive"], { canRead: true }),

  ...forRoles("approvals", ["Admin", "Manager"], {
    canRead: true,
    canUpdate: true,
  }),
  ...forRoles("approvals", ["Legal", "Finance", "Executive", "Analyst"], {
    canRead: true,
  }),

  ...forRoles("scouting", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("scouting", ["Manager", "Scout"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("scouting", ["Analyst"], {
    canRead: true,
    canCreate: true,
  }),

  ...forRoles("referrals", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  // Any team member can create a referral when they observe a need requiring another specialist
  ...forRoles(
    "referrals",
    [
      "Manager",
      "Analyst",
      "Scout",
      "Coach",
      "SkillCoach",
      "TacticalCoach",
      "FitnessCoach",
      "NutritionSpecialist",
      "GymCoach",
      "GoalkeeperCoach",
      "MentalCoach",
    ],
    {
      canRead: true,
      canCreate: true,
      canUpdate: true,
    },
  ),

  ...forRoles("injuries", ["Admin"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("injuries", ["Manager"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("injuries", ["Coach"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("injuries", ["FitnessCoach"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles(
    "injuries",
    [
      "SkillCoach",
      "TacticalCoach",
      "NutritionSpecialist",
      "Analyst",
      "Executive",
      "GraphicDesigner",
    ],
    { canRead: true },
  ),

  ...forRoles("training", ["Admin"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("training", ["Manager"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles(
    "training",
    ["Coach", "SkillCoach", "TacticalCoach", "FitnessCoach"],
    {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    },
  ),
  ...forRoles("training", ["NutritionSpecialist", "Analyst", "Scout"], {
    canRead: true,
  }),
  ...forRoles("training", ["Executive"], { canRead: true }),
  ...forRoles("training", ["Player"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),

  ...forRoles("finance", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("finance", ["Manager", "Finance"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("finance", ["Executive"], { canRead: true }),

  ...forRoles("reports", ["Admin"], {
    canRead: true,
    canCreate: true,
    canDelete: true,
  }),
  ...forRoles("reports", ["Manager"], {
    canRead: true,
    canCreate: true,
    canDelete: true,
  }),
  ...forRoles("reports", ["Analyst"], { canRead: true, canCreate: true }),
  ...forRoles(
    "reports",
    [
      "Scout",
      "Legal",
      "Finance",
      "Coach",
      "SkillCoach",
      "TacticalCoach",
      "FitnessCoach",
      "NutritionSpecialist",
      "GraphicDesigner",
      "Executive",
    ],
    { canRead: true },
  ),

  ...allRoles("tasks", { canRead: true, canCreate: true, canUpdate: true }),
  ...forRoles("tasks", ["Admin", "Manager"], { canDelete: true }),

  ...allRoles("journey", { canRead: true }),
  ...forRoles("journey", ["Admin", "Manager"], {
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles(
    "journey",
    ["Coach", "FitnessCoach", "SkillCoach", "TacticalCoach"],
    {
      canCreate: true,
      canUpdate: true,
    },
  ),

  ...allRoles("tickets", { canRead: true, canCreate: true, canUpdate: true }),
  ...forRoles("tickets", ["Admin", "Manager"], { canDelete: true }),

  ...allRoles("sessions", { canRead: true, canCreate: true, canUpdate: true }),
  ...forRoles("sessions", ["Admin", "Manager"], { canDelete: true }),

  ...forRoles(
    "session-feedback",
    [
      "Coach",
      "SkillCoach",
      "TacticalCoach",
      "FitnessCoach",
      "GoalkeeperCoach",
      "MentalCoach",
      "Analyst",
    ],
    { canRead: true, canCreate: true, canUpdate: true },
  ),
  ...forRoles("session-feedback", ["Admin", "Manager"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("session-feedback", ["NutritionSpecialist", "GymCoach"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("session-feedback", ["Player", "Executive"], { canRead: true }),

  ...allRoles("notifications", {
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),

  ...forRoles("documents", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("documents", ["Manager", "Legal"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("documents", ["Analyst"], { canRead: true, canCreate: true }),
  ...forRoles(
    "documents",
    [
      "Finance",
      "Coach",
      "SkillCoach",
      "TacticalCoach",
      "FitnessCoach",
      "NutritionSpecialist",
      "GraphicDesigner",
      "Executive",
    ],
    { canRead: true },
  ),

  ...allRoles("notes", { canRead: true, canCreate: true }),
  ...forRoles("notes", ["Admin", "Manager"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),

  ...forRoles("audit", ["Admin", "Manager", "Executive"], { canRead: true }),

  ...forRoles(
    "market-intel",
    ["Admin", "Manager", "Analyst", "Scout", "Executive"],
    { canRead: true },
  ),

  ...allRoles("settings", { canRead: true, canUpdate: true }),
  ...forRoles("settings", ["Admin"], { canCreate: true, canDelete: true }),

  ...forRoles("users", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("users", ["Manager"], { canRead: true }),

  ...allRoles("competitions", { canRead: true }),
  ...forRoles("competitions", ["Admin"], {
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("competitions", ["Manager"], {
    canCreate: true,
    canUpdate: true,
  }),

  // Squads — read-only API; writes happen via the SAFF wizard (Phase 3).
  // Mirrors the clubs read distribution since squads are a refinement of clubs.
  ...allRoles("squads", { canRead: true }),

  ...forRoles("sportmonks", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),
  ...forRoles("sportmonks", ["Manager"], { canRead: true }),

  ...forRoles("saff-data", ["Admin"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("saff-data", ["Manager"], { canRead: true, canCreate: true }),

  ...forRoles("spl-sync", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("spl-sync", ["Manager"], { canRead: true, canCreate: true }),

  ...forRoles("wellness", ["Admin", "Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("wellness", ["GymCoach"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),
  ...forRoles("wellness", ["NutritionSpecialist"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("wellness", ["FitnessCoach"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),
  ...forRoles(
    "wellness",
    ["Coach", "SkillCoach", "TacticalCoach", "Analyst", "Executive"],
    { canRead: true },
  ),
  ...forRoles("wellness", ["Player"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),

  ...forRoles("meal-plans", ["Admin", "Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("meal-plans", ["NutritionSpecialist"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("meal-plans", ["Coach", "FitnessCoach", "GymCoach"], {
    canRead: true,
  }),
  ...forRoles("meal-plans", ["Player"], { canRead: true }),
  ...forRoles("meal-plans", ["Executive"], { canRead: true }),

  // ── RTP Protocols ──
  ...forRoles("rtp", ["Admin", "Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("rtp", ["Coach", "FitnessCoach", "GoalkeeperCoach"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),
  ...forRoles("rtp", ["SkillCoach", "TacticalCoach", "MentalCoach"], {
    canRead: true,
  }),
  ...forRoles("rtp", ["Analyst", "NutritionSpecialist", "Executive"], {
    canRead: true,
  }),
  ...forRoles("rtp", ["Player"], { canRead: true }),

  // ── Tactical Intelligence ──
  ...forRoles("tactical", ["Admin", "Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("tactical", ["Analyst", "TacticalCoach"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("tactical", ["Coach", "SkillCoach", "GoalkeeperCoach"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),
  ...forRoles("tactical", ["FitnessCoach", "Executive", "Scout"], {
    canRead: true,
  }),
  ...forRoles("tactical", ["Player"], { canRead: true }),

  // ── Match Analytics ──
  ...forRoles("match-analytics", ["Admin", "Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("match-analytics", ["Analyst"], {
    canCreate: true,
    canRead: true,
    canDelete: true,
  }),
  ...forRoles(
    "match-analytics",
    ["Coach", "TacticalCoach", "SkillCoach", "FitnessCoach", "GoalkeeperCoach"],
    { canRead: true },
  ),
  ...forRoles("match-analytics", ["Executive", "Scout", "Player"], {
    canRead: true,
  }),

  // ── Injury Financials ──
  ...forRoles("injury-financials", ["Admin", "Manager", "Finance"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("injury-financials", ["Coach", "FitnessCoach"], {
    canRead: true,
  }),
  ...forRoles("injury-financials", ["Executive"], { canRead: true }),

  // ── Designs / Media & Publishing ──
  ...forRoles("designs", ["Admin", "GraphicDesigner", "ContentManager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("designs", ["Manager", "Approver", "Publisher"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),
  ...forRoles("designs", ["Executive", "Analyst", "Scout", "Coach", "Player"], {
    canRead: true,
  }),

  // ── Training Plans ──
  ...forRoles("training-plans", ["Admin", "Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles(
    "training-plans",
    ["Coach", "SkillCoach", "TacticalCoach", "FitnessCoach", "GoalkeeperCoach"],
    {
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
  ),
  ...forRoles("training-plans", ["Analyst"], { canRead: true }),
  ...forRoles("training-plans", ["Player"], { canRead: true }),

  // ── Development Reviews ──
  ...forRoles("dev-reviews", ["Admin", "Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles(
    "dev-reviews",
    [
      "Coach",
      "SkillCoach",
      "TacticalCoach",
      "FitnessCoach",
      "GoalkeeperCoach",
      "MentalCoach",
    ],
    {
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
  ),
  ...forRoles("dev-reviews", ["Analyst"], { canRead: true }),
  ...forRoles("dev-reviews", ["Player"], { canRead: true, canUpdate: true }), // Player can acknowledge

  // ── Mental Health Assessments ──
  // MentalCoach has full CRUD + sees confidential records
  ...forRoles("mental", ["MentalCoach"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  // Admin can read everything (including confidential); full management
  ...forRoles("mental", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  // Manager can read non-confidential only (enforced in service layer)
  ...forRoles("mental", ["Manager"], { canRead: true }),
  // Player can read their own assessments (enforced in service layer)
  ...forRoles("mental", ["Player"], { canRead: true }),

  // ── Video Library ──
  ...forRoles("video", ["Admin", "Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("video", ["Analyst"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles(
    "video",
    ["Coach", "TacticalCoach", "SkillCoach", "GoalkeeperCoach"],
    {
      canCreate: true,
      canRead: true,
      canUpdate: true,
    },
  ),
  ...forRoles("video", ["FitnessCoach", "Scout", "Executive"], {
    canRead: true,
  }),
  ...forRoles("video", ["Player"], { canRead: true }),

  ...forRoles("transfer-windows", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("transfer-windows", ["Manager", "Executive"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles(
    "transfer-windows",
    ["Analyst", "Scout", "Legal", "Finance", "GraphicDesigner"],
    {
      canRead: true,
    },
  ),

  ...forRoles("club-needs", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("club-needs", ["Manager", "Executive"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles(
    "club-needs",
    ["Analyst", "Scout", "Legal", "Finance", "GraphicDesigner"],
    {
      canRead: true,
    },
  ),

  // Player-Coach Assignments (multi-specialty row-scope join table)
  ...forRoles("player-coach-assignments", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("player-coach-assignments", ["Manager", "Executive"], {
    canCreate: true,
    canRead: true,
    canDelete: true,
  }),
  ...forRoles(
    "player-coach-assignments",
    [
      "Coach",
      "SkillCoach",
      "TacticalCoach",
      "FitnessCoach",
      "NutritionSpecialist",
      "GymCoach",
      "GoalkeeperCoach",
      "MentalCoach",
      // Non-coach assignable staff also need read access so the My
      // Assignments dashboard widget renders for them.
      "Analyst",
      "Scout",
      "Legal",
      "Finance",
      "GraphicDesigner",
    ],
    { canRead: true },
  ),

  // ── Staff Monitoring ──
  // Admin bypasses all permission checks — no explicit row needed.
  // SportingDirector: full monitoring read + task CRU
  ...forRoles("staffMonitoring", ["SportingDirector"], {
    canRead: true,
  }),
  ...forRoles("staffMonitoring", ["Manager", "Executive"], {
    canRead: true,
  }),
  // SportingDirector read access to operational modules
  ...forRoles("users", ["SportingDirector"], { canRead: true }),
  ...forRoles("audit", ["SportingDirector"], { canRead: true }),
  ...forRoles("players", ["SportingDirector"], { canRead: true }),
  ...forRoles("clubs", ["SportingDirector"], { canRead: true }),
  ...forRoles("contracts", ["SportingDirector"], { canRead: true }),
  ...forRoles("matches", ["SportingDirector"], { canRead: true }),
  ...forRoles("injuries", ["SportingDirector"], { canRead: true }),
  ...forRoles("reports", ["SportingDirector"], { canRead: true }),
  ...forRoles("dashboard", ["SportingDirector"], { canRead: true }),
  // SportingDirector task management (CRU, no delete)
  ...forRoles("tasks", ["SportingDirector"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),

  // ── Analyst Saved Views (Analyst Portal MVP-1) ──
  // Owner-scope visibility is enforced in the service layer; module-level
  // permission gates who is allowed to use the feature at all. Analysts
  // get full CRUD on their own views. Admin/Manager/Executive can read
  // shared views.
  ...forRoles("analyst_views", ["Analyst", "Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("analyst_views", ["Manager", "Executive"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),

  // ── Salary Benchmarks (Commercial Analytics MVP-6) ──
  ...forRoles("salary_benchmarks", ["Admin", "Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("salary_benchmarks", ["Analyst", "Executive"], {
    canRead: true,
  }),

  // ── Governance Gates (MVP-7) ──
  // Admin/Manager can trigger, resolve, and delete gates.
  // All analyst-tier roles can trigger gates and read the queue.
  ...forRoles("governance_gates", ["Admin", "Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles(
    "governance_gates",
    ["Analyst", "Scout", "Legal", "Finance", "SportingDirector", "Executive"],
    { canCreate: true, canRead: true },
  ),

  // ── Calendar ──
  // All roles can read; only staff roles can create/update/delete.
  // Actual visibility is enforced at service level via CalendarScope.
  ...forRoles(
    "calendar",
    ["Admin", "Manager", "Executive", "SportingDirector"],
    { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
  ),
  ...forRoles(
    "calendar",
    [
      "Coach",
      "SkillCoach",
      "TacticalCoach",
      "FitnessCoach",
      "GoalkeeperCoach",
      "GymCoach",
      "NutritionSpecialist",
      "MentalCoach",
    ],
    { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
  ),
  ...forRoles(
    "calendar",
    ["Analyst", "Scout", "Legal", "Finance", "GraphicDesigner"],
    { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
  ),
  ...forRoles("calendar", ["Player"], {
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  }),

  // ── Personal Workspace (Notes + Todos) ──
  // Every role gets full CRUD — user_id scoping in the service is the
  // actual security boundary; no user can access another user's data.
  ...allRoles("personal-notes", {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...allRoles("personal-todos", {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
];

function dedup(entries: Perm[]): Perm[] {
  const map = new Map<string, Perm>();
  for (const p of entries) {
    const key = `${p.role}:${p.module}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        canCreate: existing.canCreate || p.canCreate,
        canRead: existing.canRead || p.canRead,
        canUpdate: existing.canUpdate || p.canUpdate,
        canDelete: existing.canDelete || p.canDelete,
      });
    } else {
      map.set(key, { ...p });
    }
  }
  return Array.from(map.values());
}

// ═════════════════════════════════════════════════════════════
// APPROVAL CHAIN TEMPLATES
// ═════════════════════════════════════════════════════════════

interface TemplateSeed {
  entityType: string;
  action: string;
  name: string;
  nameAr: string;
  steps: Array<{
    stepNumber: number;
    approverRole: string;
    label: string;
    labelAr: string;
    dueDays: number;
  }>;
}

const APPROVAL_TEMPLATES: TemplateSeed[] = [
  {
    entityType: "contract",
    action: "review",
    name: "Contract Review",
    nameAr: "مراجعة العقد",
    steps: [
      {
        stepNumber: 1,
        approverRole: "Manager",
        label: "Manager Review",
        labelAr: "مراجعة المدير",
        dueDays: 3,
      },
      {
        stepNumber: 2,
        approverRole: "Legal",
        label: "Legal Review",
        labelAr: "المراجعة القانونية",
        dueDays: 3,
      },
    ],
  },
  {
    entityType: "payment",
    action: "approve_payment",
    name: "Payment Approval",
    nameAr: "الموافقة على الدفع",
    steps: [
      {
        stepNumber: 1,
        approverRole: "Finance",
        label: "Finance Review",
        labelAr: "مراجعة المالية",
        dueDays: 2,
      },
      {
        stepNumber: 2,
        approverRole: "Admin",
        label: "Admin Approval",
        labelAr: "موافقة المسؤول",
        dueDays: 2,
      },
    ],
  },
  {
    entityType: "offer",
    action: "review_offer",
    name: "Offer Review",
    nameAr: "مراجعة العرض",
    steps: [
      {
        stepNumber: 1,
        approverRole: "Manager",
        label: "Manager Review",
        labelAr: "مراجعة المدير",
        dueDays: 3,
      },
    ],
  },
  {
    entityType: "gate",
    action: "complete_gate",
    name: "Gate Completion",
    nameAr: "إكمال البوابة",
    steps: [
      {
        stepNumber: 1,
        approverRole: "Coach",
        label: "Coach Evaluation",
        labelAr: "تقييم المدرب",
        dueDays: 3,
      },
      {
        stepNumber: 2,
        approverRole: "Manager",
        label: "Manager Sign-off",
        labelAr: "موافقة المدير",
        dueDays: 3,
      },
    ],
  },
];

// ═════════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ═════════════════════════════════════════════════════════════

/**
 * Seed permissions — idempotent. Only truncates+reinserts if
 * the count doesn't match (i.e. permissions matrix changed).
 */
export async function seedPermissions(): Promise<void> {
  const permissions = dedup(RAW_PERMISSIONS);
  const existingCount = await RolePermission.count();

  if (existingCount >= permissions.length) {
    logger.info(
      `Permissions already seeded (${existingCount} entries) — skipping`,
    );
    return;
  }

  // Count mismatch → schema changed, truncate and re-insert
  await RolePermission.destroy({ where: {}, truncate: true, cascade: true });
  await RolePermission.bulkCreate(
    permissions.map((p) => ({
      role: p.role,
      module: p.module,
      canCreate: p.canCreate,
      canRead: p.canRead,
      canUpdate: p.canUpdate,
      canDelete: p.canDelete,
    })),
  );

  logger.info(`Seeded ${permissions.length} role permission entries`);
}

/**
 * Seed approval chain templates — idempotent per (entityType, action).
 */
export async function seedApprovalChains(): Promise<void> {
  let created = 0;

  for (const tpl of APPROVAL_TEMPLATES) {
    const existing = await ApprovalChainTemplate.findOne({
      where: {
        entityType: tpl.entityType,
        action: tpl.action,
        isActive: true,
      },
    });
    if (existing) continue;

    const template = await ApprovalChainTemplate.create({
      entityType: tpl.entityType,
      action: tpl.action,
      name: tpl.name,
      nameAr: tpl.nameAr,
      isActive: true,
    });

    await ApprovalChainTemplateStep.bulkCreate(
      tpl.steps.map((s) => ({
        templateId: template.id,
        stepNumber: s.stepNumber,
        approverRole: s.approverRole,
        label: s.label,
        labelAr: s.labelAr,
        dueDays: s.dueDays,
        isMandatory: true,
      })),
    );

    created++;
  }

  if (created > 0) {
    logger.info(`Seeded ${created} approval chain templates`);
  }
}

// ═════════════════════════════════════════════════════════════
// PACKAGE CONFIGS
// ═════════════════════════════════════════════════════════════

interface PkgEntry {
  package: string;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const F = true;
const _ = false;

// Default package access matrix (mirrors the hardcoded config)
const DEFAULT_PACKAGE_CONFIGS: PkgEntry[] = [
  // ── Package C (Basic) ──
  {
    package: "C",
    module: "players",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },
  {
    package: "C",
    module: "contracts",
    canCreate: _,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "C",
    module: "matches",
    canCreate: _,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "C",
    module: "calendar",
    canCreate: _,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "C",
    module: "notifications",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },
  {
    package: "C",
    module: "messaging",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },
  {
    package: "C",
    module: "documents",
    canCreate: _,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "C",
    module: "tickets",
    canCreate: F,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "C",
    module: "tasks",
    canCreate: _,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },

  // ── Package B (Standard) ──
  {
    package: "B",
    module: "players",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },
  {
    package: "B",
    module: "contracts",
    canCreate: _,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "B",
    module: "matches",
    canCreate: F,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "B",
    module: "calendar",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },
  {
    package: "B",
    module: "notifications",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },
  {
    package: "B",
    module: "messaging",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },
  {
    package: "B",
    module: "documents",
    canCreate: F,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "B",
    module: "tickets",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },
  {
    package: "B",
    module: "tasks",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },
  {
    package: "B",
    module: "sessions",
    canCreate: F,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "B",
    module: "referrals",
    canCreate: F,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "B",
    module: "wellness",
    canCreate: F,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "B",
    module: "injuries",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },
  {
    package: "B",
    module: "training",
    canCreate: _,
    canRead: F,
    canUpdate: _,
    canDelete: _,
  },
  {
    package: "B",
    module: "notes",
    canCreate: F,
    canRead: F,
    canUpdate: F,
    canDelete: F,
  },

  // Package A gets FULL access to everything (no rows needed — handled in code)
];

/**
 * Seed package config defaults — idempotent.
 * Only inserts if the table is empty.
 */
export async function seedPackageConfigs(): Promise<void> {
  const existingCount = await PackageConfig.count();
  if (existingCount > 0) {
    logger.info(
      `Package configs already seeded (${existingCount} entries) — skipping`,
    );
    return;
  }

  await PackageConfig.bulkCreate(
    DEFAULT_PACKAGE_CONFIGS.map((p) => ({
      package: p.package,
      module: p.module,
      canCreate: p.canCreate,
      canRead: p.canRead,
      canUpdate: p.canUpdate,
      canDelete: p.canDelete,
    })),
  );

  logger.info(
    `Seeded ${DEFAULT_PACKAGE_CONFIGS.length} package config entries`,
  );
}
