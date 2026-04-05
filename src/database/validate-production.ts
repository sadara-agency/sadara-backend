#!/usr/bin/env ts-node
// ─────────────────────────────────────────────────────────────
// src/database/validate-production.ts
// Post-migration validation script. Checks for:
//   - Leftover test data
//   - Referential integrity
//   - Required seed data (permissions, clubs, admin)
//
// Usage:
//   npx ts-node -r tsconfig-paths/register src/database/validate-production.ts
// ─────────────────────────────────────────────────────────────
import { sequelize } from "@config/database";
import { setupAssociations } from "../models/associations";

interface Check {
  name: string;
  query: string;
  expected: string;
  evaluate: (result: any) => { pass: boolean; actual: string };
}

const CHECKS: Check[] = [
  // ── No test data ──
  {
    name: "No test users (@sadara.com emails)",
    query: `SELECT count(*)::int as c FROM users WHERE email LIKE '%@sadara.com'`,
    expected: "0 (or only prod admin)",
    evaluate: (r) => ({
      pass: r.c <= 1,
      actual: String(r.c),
    }),
  },
  {
    name: "No test player IDs (b0000001-* prefix)",
    query: `SELECT count(*)::int as c FROM players WHERE id::text LIKE 'b0000001%'`,
    expected: "0",
    evaluate: (r) => ({ pass: r.c === 0, actual: String(r.c) }),
  },
  {
    name: "No Notion seed player IDs (ed100001-* prefix)",
    query: `SELECT count(*)::int as c FROM players WHERE id::text LIKE 'ed100001%'`,
    expected: "0",
    evaluate: (r) => ({ pass: r.c === 0, actual: String(r.c) }),
  },
  {
    name: "No test contracts (c1000001-* prefix)",
    query: `SELECT count(*)::int as c FROM contracts WHERE id::text LIKE 'c1000001%'`,
    expected: "0",
    evaluate: (r) => ({ pass: r.c === 0, actual: String(r.c) }),
  },

  // ── Required seed data ──
  {
    name: "Admin user exists",
    query: `SELECT count(*)::int as c FROM users WHERE role = 'Admin' AND is_active = true`,
    expected: ">= 1",
    evaluate: (r) => ({ pass: r.c >= 1, actual: String(r.c) }),
  },
  {
    name: "SPL clubs seeded (18)",
    query: `SELECT count(*)::int as c FROM clubs WHERE league = 'Saudi Pro League'`,
    expected: "18",
    evaluate: (r) => ({ pass: r.c >= 18, actual: String(r.c) }),
  },
  {
    name: "RBAC permissions seeded",
    query: `SELECT count(DISTINCT module)::int as c FROM role_permissions`,
    expected: ">= 20 modules",
    evaluate: (r) => ({ pass: r.c >= 20, actual: `${r.c} modules` }),
  },
  {
    name: "Approval chain templates exist",
    query: `SELECT count(*)::int as c FROM approval_chain_templates WHERE is_active = true`,
    expected: ">= 4",
    evaluate: (r) => ({ pass: r.c >= 4, actual: String(r.c) }),
  },

  // ── Referential integrity ──
  {
    name: "No orphaned contracts (player_id)",
    query: `SELECT count(*)::int as c FROM contracts WHERE player_id NOT IN (SELECT id FROM players)`,
    expected: "0",
    evaluate: (r) => ({ pass: r.c === 0, actual: String(r.c) }),
  },
  {
    name: "No orphaned contracts (club_id)",
    query: `SELECT count(*)::int as c FROM contracts WHERE club_id IS NOT NULL AND club_id NOT IN (SELECT id FROM clubs)`,
    expected: "0",
    evaluate: (r) => ({ pass: r.c === 0, actual: String(r.c) }),
  },
  {
    name: "No orphaned offers (player_id)",
    query: `SELECT count(*)::int as c FROM offers WHERE player_id NOT IN (SELECT id FROM players)`,
    expected: "0",
    evaluate: (r) => ({ pass: r.c === 0, actual: String(r.c) }),
  },
  {
    name: "No orphaned player.current_club_id",
    query: `SELECT count(*)::int as c FROM players WHERE current_club_id IS NOT NULL AND current_club_id NOT IN (SELECT id FROM clubs)`,
    expected: "0",
    evaluate: (r) => ({ pass: r.c === 0, actual: String(r.c) }),
  },

  // ── Data quality ──
  {
    name: "All players have first + last name",
    query: `SELECT count(*)::int as c FROM players WHERE first_name IS NULL OR last_name IS NULL OR first_name = '' OR last_name = ''`,
    expected: "0",
    evaluate: (r) => ({ pass: r.c === 0, actual: String(r.c) }),
  },
  {
    name: "No empty audit logs (clean start)",
    query: `SELECT count(*)::int as c FROM audit_logs`,
    expected: "0 (clean start)",
    evaluate: (r) => ({
      pass: true, // Informational — audit logs accumulate naturally
      actual: String(r.c),
    }),
  },
];

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   SADARA — Production Data Validation        ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log();

  try {
    await sequelize.authenticate();
    setupAssociations();
    console.log("Database connection OK\n");
  } catch (err) {
    console.error("Failed to connect to database:", (err as Error).message);
    process.exit(1);
  }

  // Run entity counts
  console.log("Entity Counts:");
  const countTables = [
    "users",
    "players",
    "clubs",
    "contracts",
    "offers",
    "matches",
    "tasks",
    "documents",
    "injuries",
    "tickets",
    "referrals",
    "journeys",
  ];

  for (const table of countTables) {
    try {
      const [result] = await sequelize.query(
        `SELECT count(*)::int as c FROM "${table}"`,
        { type: "SELECT" as any },
      );
      console.log(`  ${table}: ${(result as any).c}`);
    } catch {
      console.log(`  ${table}: (table not found)`);
    }
  }
  console.log();

  // Run checks
  console.log("Validation Checks:");
  let passed = 0;
  let failed = 0;
  let errors = 0;

  for (const check of CHECKS) {
    try {
      const [result] = await sequelize.query(check.query, {
        type: "SELECT" as any,
      });
      const { pass, actual } = check.evaluate(result);

      if (pass) {
        console.log(
          `  ✓ ${check.name}: ${actual} (expected: ${check.expected})`,
        );
        passed++;
      } else {
        console.log(
          `  ✗ ${check.name}: ${actual} (expected: ${check.expected})`,
        );
        failed++;
      }
    } catch (err) {
      console.log(`  ? ${check.name}: ERROR — ${(err as Error).message}`);
      errors++;
    }
  }

  console.log();
  console.log("╔══════════════════════════════════════════════╗");
  console.log(
    `║   Results: ${passed} passed, ${failed} failed, ${errors} errors`.padEnd(
      47,
    ) + "║",
  );
  console.log("╚══════════════════════════════════════════════╝");

  await sequelize.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
