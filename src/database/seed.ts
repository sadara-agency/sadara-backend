// ─────────────────────────────────────────────────────────────
// src/database/seed.ts
// Main seed orchestrator — imports modular seed files.
//
// File structure:
//   src/database/seed/
//   ├── ids.ts              — Fixed UUIDs (shared constants)
//   ├── schema.ts           — Missing tables & views
//   ├── users.seed.ts       — Admin, Agent, Analyst, Scout, Player
//   ├── clubs.seed.ts       — 8 SPL clubs
//   ├── players.seed.ts     — 10 Pro + 5 Youth players
//   ├── contracts.seed.ts   — 12 contracts
//   ├── matches.seed.ts     — 8 matches + match players + stats
//   └── operations.seed.ts  — Offers, tasks, finance, docs, gates, referrals, scouting
// ─────────────────────────────────────────────────────────────
import { sequelize } from "@config/database";
import { env } from "@config/env";
import { User } from "@modules/users/user.model";

// Data seeders
import { seedUsers } from "./users.seed";
import { seedClubs } from "./clubs.seed";
import { seedPlayers } from "./players.seed";
import { seedContracts } from "./contracts.seed";
import {
  seedMatches,
  seedMatchPlayers,
  seedMatchStats,
  seedPerformances,
} from "./matches.seed";
import {
  seedOffers,
  seedTasks,
  seedFinance,
  seedDocuments,
  seedGates,
  seedReferrals,
  seedScouting,
} from "./operations.seed";
import { seedPermissions } from "./permissions.seed";
import { seedApprovalChains } from "./approvalChains.seed";
import { seedAutoTaskTestData } from "./autoTaskSeed";
import { seedProdAdmin, seedProdClubs } from "./production.seed";

export async function seedDatabase(): Promise<void> {
  // Permissions must always be seeded (all environments)
  try {
    await seedPermissions();
  } catch (err) {
    console.error("❌ Permissions seed failed:", (err as Error).message);
  }

  // Approval chain templates must always be seeded (all environments)
  try {
    await seedApprovalChains();
  } catch (err) {
    console.error("❌ Approval chains seed failed:", (err as Error).message);
  }

  // Check if already seeded (any environment)
  const existingAdmin = await User.findOne({
    where: { email: "admin@sadara.com" },
  });
  if (existingAdmin) {
    console.log("⏭️  Database already seeded (admin user exists)");
    return;
  }

  // ── Seed baseline data (all environments) ──
  try {
    const isProd = env.nodeEnv !== "development";
    console.log(
      isProd
        ? "🌱 Seeding production database..."
        : "🌱 Seeding development database...",
    );

    // Production uses seedProdAdmin (password from env or default),
    // development uses seedUsers (fixed demo accounts)
    if (isProd) {
      await seedProdAdmin();
    } else {
      await seedUsers();
    }

    // Reference & operational data — same for all environments
    if (isProd) {
      await seedProdClubs();
    } else {
      await seedClubs();
    }
    await seedPlayers();
    await seedContracts();
    await seedMatches();
    await seedOffers();
    await seedTasks();
    await seedFinance();
    await seedDocuments();
    await seedGates();
    await seedReferrals();
    await seedScouting();
    await seedPerformances();
    await seedMatchPlayers();
    await seedMatchStats();

    if (!isProd) {
      // Extra test data only in development
      await seedAutoTaskTestData();
    }

    console.log("");
    console.log("🎉 Seed complete!");
    if (!isProd) {
      console.log("   📧 admin@sadara.com   / Sadara2025!");
      console.log("   📧 agent@sadara.com   / Sadara2025!");
      console.log("   📧 analyst@sadara.com / Sadara2025!");
      console.log("   📧 scout@sadara.com   / Sadara2025!");
      console.log("   📧 salem@sadara.com   / Sadara2025! (Player)");
    }
  } catch (err) {
    console.error("❌ Seed failed:", (err as Error).message);
    console.error((err as Error).stack);
    // Re-throw error to prevent server from starting with incomplete data
    throw err;
  }
}
