// ─────────────────────────────────────────────────────────────
// Permissions seed — mirrors the exact current authorize() calls
// across all 27 route files so that switching to DB-driven
// permissions changes nothing for existing users.
// ─────────────────────────────────────────────────────────────
import { RolePermission } from "@modules/permissions/permission.model";

interface Perm {
  role: string;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

/** Base roles for general module access. GymCoach is excluded here
 *  and gets explicit permissions at the bottom of the matrix. */
const ALL_ROLES = [
  "Admin",
  "Manager",
  "Analyst",
  "Scout",
  "Player",
  "Legal",
  "Finance",
  "Coach",
  "Media",
  "Executive",
];

/** Shorthand: give every role specific flags for a module. */
function allRoles(module: string, flags: Partial<Perm>): Perm[] {
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

/** Shorthand: override specific roles for a module. */
function forRoles(
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

// ─────────────────────────────────────────────────────────────
// The permission matrix, derived from exhaustive analysis of
// every authorize() and authenticate-only route.
//
// Convention:
//   authenticate-only (any user) → canRead for all
//   authorize("Admin","Manager") on POST → canCreate for those
//   authorize(...) on PATCH/PUT → canUpdate for those
//   authorize("Admin") on DELETE → canDelete for Admin
// ─────────────────────────────────────────────────────────────

const RAW: Perm[] = [
  // ── dashboard: all routes are authenticate-only ──
  ...allRoles("dashboard", { canRead: true }),

  // ── players: read=all, write=Admin+Manager, DELETE=Admin ──
  // All roles can read player profiles (field-level hiding protects sensitive fields)
  ...allRoles("players", { canRead: true }),
  ...forRoles("players", ["Admin"], {
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("players", ["Manager"], { canCreate: true, canUpdate: true }),

  // ── clubs: read=most roles, write=Admin+Manager, DELETE=Admin ──
  // Finance excluded (no business need for club data)
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
    ["Analyst", "Scout", "Player", "Legal", "Coach", "Media", "Executive"],
    { canRead: true },
  ),

  // ── matches: read=tactical/scouting roles, write=Admin+Manager+Coach ──
  // Legal & Finance excluded (no tactical/match need)
  ...forRoles("matches", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("matches", ["Manager", "Coach"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("matches", ["Analyst"], { canRead: true, canUpdate: true }),
  ...forRoles("matches", ["Scout", "Player", "Media", "Executive"], {
    canRead: true,
  }),

  // ── contracts: STRICT — only management, legal, finance, executive ──
  // Scout, Coach, Media, Player excluded (data silo: salary/legal terms)
  // Player access handled via row-level filtering (own contracts only)
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
  ...forRoles("contracts", ["Player"], { canRead: true }), // row-level: own only

  // ── offers: STRICT — only management, legal, finance, executive ──
  // Scout, Player, Coach, Media excluded (negotiation confidentiality)
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

  // ── gates: management/analyst workflow only ──
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

  // ── approvals: management/legal/finance/executive ──
  ...forRoles("approvals", ["Admin", "Manager"], {
    canRead: true,
    canUpdate: true,
  }),
  ...forRoles("approvals", ["Legal", "Finance", "Executive", "Analyst"], {
    canRead: true,
  }),

  // ── scouting: STRICT — scouting pipeline roles only ──
  // Player, Legal, Finance, Media excluded (internal talent pipeline)
  ...forRoles("scouting", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("scouting", ["Manager", "Analyst", "Scout"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("scouting", ["Coach", "Executive"], { canRead: true }),

  // ── referrals: scouting pipeline roles only ──
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
  ...forRoles("referrals", ["Executive"], { canRead: true }),

  // ── injuries: STRICT — medical/performance roles only ──
  // Finance, Legal, Scout excluded (medical privacy)
  // Media: read-only status (field-level hides diagnosis/treatment)
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
  ...forRoles("injuries", ["Analyst", "Executive", "Media"], {
    canRead: true,
  }),
  ...forRoles("injuries", ["Player"], { canRead: true }), // row-level: own only

  // ── training: performance/coaching roles only ──
  // Legal, Finance, Media excluded
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
  ...forRoles("training", ["Coach"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("training", ["Analyst", "Scout"], {
    canRead: true,
  }),
  ...forRoles("training", ["Player", "Executive"], { canRead: true }),

  // ── finance: STRICT — financial roles only ──
  // Scout, Player, Coach, Media, Legal excluded (financial confidentiality)
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
  ...forRoles("finance", ["Analyst"], { canRead: true, canCreate: true }),
  ...forRoles("finance", ["Executive"], { canRead: true }),

  // ── reports: most roles can read, restricted create ──
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
    ["Scout", "Legal", "Finance", "Coach", "Media", "Executive"],
    { canRead: true },
  ),

  // ── tasks: all roles can manage their own tasks ──
  ...allRoles("tasks", { canRead: true, canCreate: true, canUpdate: true }),
  ...forRoles("tasks", ["Admin", "Manager"], { canDelete: true }),

  // ── notifications: all CRUD for all (personal) ──
  ...allRoles("notifications", {
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),

  // ── documents: read=most, write=Admin+Manager+Analyst+Legal ──
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
    ["Scout", "Player", "Finance", "Coach", "Media", "Executive"],
    { canRead: true },
  ),

  // ── audit: Admin+Manager+Executive only ──
  ...forRoles("audit", ["Admin", "Manager", "Executive"], { canRead: true }),

  // ── market-intel: scouting/analysis roles ──
  ...forRoles(
    "market-intel",
    ["Admin", "Manager", "Analyst", "Scout", "Executive"],
    {
      canRead: true,
    },
  ),

  // ── settings: read/update for all, create/delete for Admin ──
  ...allRoles("settings", { canRead: true, canUpdate: true }),
  ...forRoles("settings", ["Admin"], { canCreate: true, canDelete: true }),

  // ── competitions: read=all, write=Admin+Manager ──
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

  // ── saff-data: Admin+Manager only ──
  ...forRoles("saff-data", ["Admin"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("saff-data", ["Manager"], { canRead: true, canCreate: true }),

  // ── spl-sync: Admin+Manager only ──
  ...forRoles("spl-sync", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("spl-sync", ["Manager"], { canRead: true, canCreate: true }),

  // ── gym: GymCoach has full CRUD, Admin/Manager/Coach/Player can read ──
  ...forRoles("gym", ["Admin"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("gym", ["GymCoach"], {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("gym", ["Manager", "Coach"], { canRead: true }),
  ...forRoles("gym", ["Player"], { canRead: true }), // row-level: own only

  // ── clearances: management/legal/finance/executive ──
  ...forRoles(
    "clearances",
    ["Admin", "Manager", "Legal", "Finance", "Executive"],
    {
      canRead: true,
    },
  ),

  // ── GymCoach access to existing modules ──
  ...forRoles("dashboard", ["GymCoach"], { canRead: true }),
  ...forRoles("players", ["GymCoach"], { canRead: true }),
  ...forRoles("injuries", ["GymCoach"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
  ...forRoles("training", ["GymCoach"], { canRead: true }),
  ...forRoles("notifications", ["GymCoach"], {
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }),
  ...forRoles("settings", ["GymCoach"], { canRead: true, canUpdate: true }),
  ...forRoles("tasks", ["GymCoach"], {
    canRead: true,
    canCreate: true,
    canUpdate: true,
  }),
];

// ─────────────────────────────────────────────────────────────
// Deduplicate: later entries merge (OR) with earlier ones
// for the same role+module. This lets us layer base permissions
// then add specific overrides.
// ─────────────────────────────────────────────────────────────

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

// ── Seed function ──

export async function seedPermissions(): Promise<void> {
  const permissions = dedup(RAW);

  await RolePermission.bulkCreate(
    permissions.map((p) => ({
      role: p.role,
      module: p.module,
      canCreate: p.canCreate,
      canRead: p.canRead,
      canUpdate: p.canUpdate,
      canDelete: p.canDelete,
    })),
    {
      updateOnDuplicate: ["canCreate", "canRead", "canUpdate", "canDelete"],
    },
  );

  console.log(`  ✅ Seeded ${permissions.length} role permission entries`);
}
