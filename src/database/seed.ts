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
import { seedGymData } from "./gym.seed";
import { seedAutoTaskTestData } from "./autoTaskSeed";

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

  // Gym exercise library and food database (all environments)
  try {
    await seedGymData();
  } catch (err) {
    console.error("❌ Gym seed failed:", (err as Error).message);
  }

  if (env.nodeEnv !== "development") {
    console.log("⏭️  Skipping dev seed — not in development mode");
    return;
  }

  try {
    // Check if already seeded
    const existingAdmin = await User.findOne({
      where: { email: "admin@sadara.com" },
    });
    if (existingAdmin) {
      console.log("⏭️  Database already seeded (admin user exists)");
      return;
    }

    console.log("🌱 Seeding development database...");

    // Sync models → create tables (first-time only)
    await sequelize.sync({ alter: false });

    // Seed in FK order
    await seedUsers();
    await seedClubs();
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

    // Auto-task trigger test data (contracts, offers, injuries, etc. in trigger-ready states)
    await seedAutoTaskTestData();

    console.log("");
    console.log("🎉 Development seed complete!");
    console.log("   📧 admin@sadara.com   / Sadara2025!");
    console.log("   📧 agent@sadara.com   / Sadara2025!");
    console.log("   📧 analyst@sadara.com / Sadara2025!");
    console.log("   📧 scout@sadara.com   / Sadara2025!");
    console.log("   📧 salem@sadara.com   / Sadara2025! (Player)");
  } catch (err) {
    console.error("❌ Seed failed:", (err as Error).message);
    console.error((err as Error).stack);
    // Re-throw error to prevent server from starting with incomplete data
    throw err;
  }
}
