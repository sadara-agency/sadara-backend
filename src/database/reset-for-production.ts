#!/usr/bin/env ts-node
// ─────────────────────────────────────────────────────────────
// src/database/reset-for-production.ts
// One-time CLI script to clean ALL test/seed data from the
// database and re-seed only production essentials.
//
// Usage:
//   npx ts-node -r tsconfig-paths/register src/database/reset-for-production.ts --confirm
//
// Safety:
//   - Requires --confirm flag
//   - Creates pg_dump backup before truncating
//   - Preserves SequelizeMeta (migration state)
//   - Preserves role_field_permissions (admin-configured)
//   - Re-seeds: permissions, approval chains, admin user, SPL clubs
// ─────────────────────────────────────────────────────────────
import { sequelize } from "@config/database";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { setupAssociations } from "../models/associations";
import { seedProduction } from "./production.seed";
import { execSync } from "child_process";
import path from "path";

const CONFIRM_FLAG = "--confirm";
const DRY_RUN_FLAG = "--dry-run";

// Tables to TRUNCATE (all data tables except migration tracker
// and role_field_permissions which are admin-configured).
const DATA_TABLES = [
  // Dependent/leaf tables first (FK ordering handled by CASCADE)
  "signature_audit_trails",
  "signature_signers",
  "signature_requests",
  "event_attendees",
  "calendar_events",
  "social_posts",
  "media_kit_generations",
  "press_releases",
  "media_contacts",
  "media_requests",
  "spl_tracked_players",
  "spl_insights",
  "spl_competitions",
  "technical_reports",
  "match_analyses",
  "notes",
  "training_activities",
  "training_enrollments",
  "training_courses",
  "wellness_meal_logs",
  "wellness_weight_logs",
  "wellness_profiles",
  "injury_updates",
  "injuries",
  "approval_steps",
  "approval_requests",
  "approval_chain_template_steps",
  "approval_chain_templates",
  "clearances",
  "ledger_entries",
  "expenses",
  "valuations",
  "payments",
  "invoices",
  "gate_checklists",
  "gates",
  "documents",
  "screening_cases",
  "selection_decisions",
  "watchlists",
  "sessions",
  "journeys",
  "referrals",
  "tickets",
  "tasks",
  "match_players",
  "player_match_stats",
  "matches",
  "offers",
  "contracts",
  "player_club_history",
  "external_provider_mappings",
  "players",
  "club_competitions",
  "competitions",
  "saff_fixtures",
  "saff_standings",
  "saff_team_maps",
  "saff_tournaments",
  "notifications",
  "audit_logs",
  "refresh_tokens",
  "player_accounts",
  "users",
  "clubs",
  "role_permissions",
];

async function main() {
  const args = process.argv.slice(2);
  const confirmed = args.includes(CONFIRM_FLAG);
  const dryRun = args.includes(DRY_RUN_FLAG);

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   SADARA — Production Database Reset Tool    ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log();

  if (!confirmed && !dryRun) {
    console.error(
      `This script will DELETE ALL DATA from the database.\n` +
        `Run with ${CONFIRM_FLAG} to proceed, or ${DRY_RUN_FLAG} to preview.\n\n` +
        `  npx ts-node -r tsconfig-paths/register src/database/reset-for-production.ts --confirm`,
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log("[DRY RUN] No changes will be made.\n");
  }

  // Connect to DB
  console.log(`Environment: ${env.nodeEnv}`);
  console.log(`Database:    ${env.db.name}@${env.db.host}:${env.db.port}`);
  console.log();

  try {
    await sequelize.authenticate();
    setupAssociations();
    console.log("Database connection OK\n");
  } catch (err) {
    console.error("Failed to connect to database:", (err as Error).message);
    process.exit(1);
  }

  // Step 1: Backup
  if (!dryRun) {
    console.log("Step 1/3: Creating database backup...");
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.resolve(
        process.cwd(),
        `backup_${env.db.name}_${timestamp}.dump`,
      );

      const pgDumpCmd = [
        "pg_dump",
        `-h ${env.db.host}`,
        `-p ${env.db.port}`,
        `-U ${env.db.user}`,
        `-Fc`,
        `-f "${backupFile}"`,
        env.db.name,
      ].join(" ");

      execSync(pgDumpCmd, {
        env: { ...process.env, PGPASSWORD: env.db.password },
        stdio: "inherit",
      });

      console.log(`  Backup saved: ${backupFile}\n`);
    } catch (err) {
      console.error("  WARNING: pg_dump failed. Proceeding without backup.");
      console.error(`  Error: ${(err as Error).message}`);
      console.error(
        "  If you want a backup, install PostgreSQL client tools and retry.\n",
      );
      // Don't exit — pg_dump may not be installed locally, and the user
      // may have their own backup strategy (e.g., Cloud SQL automated backups).
    }
  } else {
    console.log("Step 1/3: [DRY RUN] Would create pg_dump backup\n");
  }

  // Step 2: Truncate all data tables
  console.log("Step 2/3: Truncating data tables...");

  // Build a single TRUNCATE statement with CASCADE
  // Filter to only tables that actually exist
  const [existingTables] = await sequelize.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const existingTableNames = new Set(
    (existingTables as Array<{ tablename: string }>).map((t) => t.tablename),
  );

  const tablesToTruncate = DATA_TABLES.filter((t) => existingTableNames.has(t));
  const skippedTables = DATA_TABLES.filter((t) => !existingTableNames.has(t));

  if (skippedTables.length > 0) {
    console.log(
      `  Skipping ${skippedTables.length} tables (not found): ${skippedTables.join(", ")}`,
    );
  }

  if (tablesToTruncate.length === 0) {
    console.log("  No tables to truncate.\n");
  } else if (dryRun) {
    console.log(
      `  [DRY RUN] Would truncate ${tablesToTruncate.length} tables:`,
    );
    tablesToTruncate.forEach((t) => console.log(`    - ${t}`));
    console.log();
  } else {
    const truncateSQL = `TRUNCATE TABLE ${tablesToTruncate.map((t) => `"${t}"`).join(", ")} CASCADE`;
    await sequelize.query(truncateSQL);
    console.log(`  Truncated ${tablesToTruncate.length} tables\n`);
  }

  // Step 3: Re-seed production essentials
  console.log("Step 3/3: Seeding production data...");

  if (dryRun) {
    console.log("  [DRY RUN] Would seed:");
    console.log("    - RBAC permissions (17 roles x ~25 modules)");
    console.log("    - Approval chain templates (4 templates)");
    console.log("    - Admin user");
    console.log("    - 18 SPL clubs");
    console.log();
  } else {
    await seedProduction();
    console.log();
  }

  // Summary
  console.log("╔══════════════════════════════════════════════╗");
  if (dryRun) {
    console.log("║   DRY RUN COMPLETE — no changes made        ║");
  } else {
    console.log("║   RESET COMPLETE                             ║");
  }
  console.log("╚══════════════════════════════════════════════╝");
  console.log();

  if (!dryRun) {
    // Quick validation
    const [[userCount]] = await sequelize.query(
      `SELECT count(*)::int as c FROM users`,
    );
    const [[clubCount]] = await sequelize.query(
      `SELECT count(*)::int as c FROM clubs`,
    );
    const [[permCount]] = await sequelize.query(
      `SELECT count(*)::int as c FROM role_permissions`,
    );
    const [[playerCount]] = await sequelize.query(
      `SELECT count(*)::int as c FROM players`,
    );

    console.log("Post-reset validation:");
    console.log(`  Users:       ${(userCount as any).c} (expected: 1 admin)`);
    console.log(`  Clubs:       ${(clubCount as any).c} (expected: 18 SPL)`);
    console.log(`  Permissions: ${(permCount as any).c} (expected: ~400+)`);
    console.log(`  Players:     ${(playerCount as any).c} (expected: 0)`);
    console.log();
    console.log("Next steps:");
    console.log(
      "  1. Import real data: npx ts-node -r tsconfig-paths/register src/database/csv-import/index.ts",
    );
    console.log(
      "  2. Validate: npx ts-node -r tsconfig-paths/register src/database/validate-production.ts",
    );
  }

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
