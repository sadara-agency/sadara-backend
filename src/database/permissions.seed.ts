// ─────────────────────────────────────────────────────────────
// Permissions seed — mirrors the exact current authorize() calls
// across all 27 route files so that switching to DB-driven
// permissions changes nothing for existing users.
// ─────────────────────────────────────────────────────────────
import { RolePermission } from "../modules/permissions/permission.model";

interface Perm {
  role: string;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const ALL_ROLES = [
  "Admin", "Manager", "Analyst", "Scout", "Player",
  "Legal", "Finance", "Coach", "Media", "Executive",
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

  // ── players: GET=any, POST/PATCH=Admin+Manager, DELETE=Admin ──
  ...allRoles("players", { canRead: true }),
  ...forRoles("players", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("players", ["Manager"], { canCreate: true, canUpdate: true }),

  // ── clubs: GET=any, POST/PATCH=Admin+Manager, DELETE=Admin ──
  ...allRoles("clubs", { canRead: true }),
  ...forRoles("clubs", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("clubs", ["Manager"], { canCreate: true, canUpdate: true }),

  // ── matches: GET=any, POST/PATCH=Admin+Manager+Coach, score/stats PATCH=+Analyst, DELETE=Admin ──
  ...allRoles("matches", { canRead: true }),
  ...forRoles("matches", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("matches", ["Manager", "Coach"], { canCreate: true, canUpdate: true }),
  ...forRoles("matches", ["Analyst"], { canUpdate: true }),

  // ── contracts: GET=any, POST/PATCH/transition=Admin+Manager+Legal, DELETE=Admin ──
  ...allRoles("contracts", { canRead: true }),
  ...forRoles("contracts", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("contracts", ["Manager", "Legal"], { canCreate: true, canUpdate: true }),

  // ── offers: GET=any, POST/PATCH=Admin+Manager, DELETE=Admin ──
  ...allRoles("offers", { canRead: true }),
  ...forRoles("offers", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("offers", ["Manager"], { canCreate: true, canUpdate: true }),

  // ── gates: GET=any, POST/PATCH=Admin+Manager, checklist toggle=+Analyst, DELETE=Admin ──
  ...allRoles("gates", { canRead: true }),
  ...forRoles("gates", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("gates", ["Manager"], { canCreate: true, canUpdate: true }),
  ...forRoles("gates", ["Analyst"], { canUpdate: true }),

  // ── approvals: GET=any, approve/reject PATCH=Admin+Manager ──
  ...allRoles("approvals", { canRead: true }),
  ...forRoles("approvals", ["Admin", "Manager"], { canUpdate: true }),

  // ── scouting: GET=any, watchlist POST=Admin+Manager+Analyst, screening/decisions POST=Admin+Manager, DELETE=Admin ──
  ...allRoles("scouting", { canRead: true }),
  ...forRoles("scouting", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("scouting", ["Manager"], { canCreate: true, canUpdate: true }),
  ...forRoles("scouting", ["Analyst"], { canCreate: true, canUpdate: true }),

  // ── referrals: GET=any, POST=Admin+Manager+Analyst, PATCH=Admin+Manager(+Analyst status), DELETE=Admin ──
  ...allRoles("referrals", { canRead: true }),
  ...forRoles("referrals", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("referrals", ["Manager"], { canCreate: true, canUpdate: true }),
  ...forRoles("referrals", ["Analyst"], { canCreate: true, canUpdate: true }),

  // ── injuries: GET/POST/PATCH=any authenticated, DELETE=Admin+Manager ──
  ...allRoles("injuries", { canRead: true, canCreate: true, canUpdate: true }),
  ...forRoles("injuries", ["Admin", "Manager"], { canDelete: true }),

  // ── training: GET/POST/PATCH=any authenticated, DELETE=Admin+Manager+Coach ──
  ...allRoles("training", { canRead: true, canCreate: true, canUpdate: true }),
  ...forRoles("training", ["Admin", "Manager", "Coach"], { canDelete: true }),

  // ── finance: GET=any, POST/PATCH=Admin+Manager+Finance, valuations POST=+Analyst, DELETE=Admin ──
  ...allRoles("finance", { canRead: true }),
  ...forRoles("finance", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("finance", ["Manager", "Finance"], { canCreate: true, canUpdate: true }),
  ...forRoles("finance", ["Analyst"], { canCreate: true }),

  // ── reports: GET/POST=any authenticated, DELETE=Admin+Manager ──
  ...allRoles("reports", { canRead: true, canCreate: true }),
  ...forRoles("reports", ["Admin", "Manager"], { canDelete: true }),

  // ── tasks: GET/POST/PATCH=any authenticated, DELETE=Admin+Manager ──
  ...allRoles("tasks", { canRead: true, canCreate: true, canUpdate: true }),
  ...forRoles("tasks", ["Admin", "Manager"], { canDelete: true }),

  // ── notifications: all CRUD for all (personal) ──
  ...allRoles("notifications", { canRead: true, canUpdate: true, canDelete: true }),

  // ── documents: GET=any, POST=Admin+Manager+Analyst+Legal, PATCH=Admin+Manager+Legal, DELETE=Admin ──
  ...allRoles("documents", { canRead: true }),
  ...forRoles("documents", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("documents", ["Manager", "Legal"], { canCreate: true, canUpdate: true }),
  ...forRoles("documents", ["Analyst"], { canCreate: true }),

  // ── audit: GET=Admin+Manager only ──
  ...forRoles("audit", ["Admin", "Manager"], { canRead: true }),

  // ── market-intel: read for Admin+Manager+Analyst (matches nav config) ──
  ...forRoles("market-intel", ["Admin", "Manager", "Analyst"], { canRead: true }),

  // ── settings: read/update for all, create/delete for Admin ──
  ...allRoles("settings", { canRead: true, canUpdate: true }),
  ...forRoles("settings", ["Admin"], { canCreate: true, canDelete: true }),

  // ── saff-data: GET=any, POST=Admin(+Manager for fetch/maps) ──
  ...allRoles("saff-data", { canRead: true }),
  ...forRoles("saff-data", ["Admin"], { canCreate: true, canUpdate: true }),
  ...forRoles("saff-data", ["Manager"], { canCreate: true }),

  // ── spl-sync: GET=any, POST=Admin+Manager, admin-only ops=Admin ──
  ...allRoles("spl-sync", { canRead: true }),
  ...forRoles("spl-sync", ["Admin"], { canCreate: true, canUpdate: true, canDelete: true }),
  ...forRoles("spl-sync", ["Manager"], { canCreate: true }),
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
      updateOnDuplicate: [
        "canCreate",
        "canRead",
        "canUpdate",
        "canDelete",
      ],
    },
  );

  console.log(`  ✅ Seeded ${permissions.length} role permission entries`);
}
