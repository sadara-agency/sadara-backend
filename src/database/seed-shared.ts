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
  "Media",
  "Executive",
  "GoalkeeperCoach",
  "MentalCoach",
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
      "Media",
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
  ...forRoles("matches", ["Scout", "Player", "Media", "Executive"], {
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
  }),

  ...forRoles("referrals", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("referrals", ["Manager", "Analyst", "Scout"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),

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
      "Media",
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
      "Media",
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
      "Media",
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

  ...forRoles(
    "clearances",
    ["Admin", "Manager", "Legal", "Finance", "Executive"],
    { canRead: true },
  ),

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

  ...forRoles("media_requests", ["Admin", "Manager", "Media"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("media_requests", ["Executive"], { canRead: true }),

  ...forRoles("media_contacts", ["Admin", "Manager", "Media"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),

  ...forRoles("press_releases", ["Admin", "Media"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("press_releases", ["Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),
  ...forRoles("press_releases", ["Executive", "Analyst"], { canRead: true }),

  ...forRoles("media_kits", ["Admin", "Manager", "Media"], {
    canCreate: true,
    canRead: true,
  }),
  ...forRoles("media_kits", ["Executive", "Analyst", "Scout"], {
    canRead: true,
  }),

  ...forRoles("social_media", ["Admin", "Media"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("social_media", ["Manager"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
  }),
  ...forRoles("social_media", ["Executive"], { canRead: true }),
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
