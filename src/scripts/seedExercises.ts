// ─────────────────────────────────────────────────────────────────────────────
// scripts/seedExercises.ts
//
// Seeds the wellness_exercises table from the free-exercise-db dataset
// (https://github.com/yuhonas/free-exercise-db, ~873 exercises).
//
// Photos are referenced via the GitHub raw CDN — no images downloaded.
// Idempotent: bulkCreate uses ignoreDuplicates by name (unique catalogue).
//
// Usage:
//   npx ts-node -r tsconfig-paths/register src/scripts/seedExercises.ts \
//     [--dry-run] [--admin-email admin@sadara.com]
// ─────────────────────────────────────────────────────────────────────────────

import { sequelize } from "@config/database";
import { setupAssociations } from "../models/associations";
import { User } from "@modules/users/user.model";
import { WellnessExercise } from "@modules/wellness/fitness.model";
import type { MuscleGroup, Equipment } from "@modules/wellness/fitness.model";
import { logger } from "@config/logger";

// ── CLI args ─────────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const DRY_RUN = process.argv.includes("--dry-run");
const ADMIN_EMAIL = arg("admin-email");

// ── Source dataset ───────────────────────────────────────────────────────────

const SOURCE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

interface FreeExercise {
  id: string;
  name: string;
  force?: string | null;
  level?: string;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  instructions: string[];
  category?: string;
  images?: string[];
}

// ── Mapping helpers ──────────────────────────────────────────────────────────

const MUSCLE_GROUP_MAP: Record<string, MuscleGroup> = {
  chest: "chest",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  shoulders: "shoulders",
  neck: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  abdominals: "core",
  abductors: "core",
  adductors: "core",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
  glutes: "glutes",
};

const EQUIPMENT_MAP: Record<string, Equipment> = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  cable: "cable",
  machine: "machine",
  "body only": "bodyweight",
  bodyweight: "bodyweight",
  kettlebells: "kettlebell",
  kettlebell: "kettlebell",
  bands: "band",
  band: "band",
  "medicine ball": "other",
  "exercise ball": "other",
  "foam roll": "other",
  "ez curl bar": "barbell",
  "e-z curl bar": "barbell",
  other: "other",
};

function mapMuscleGroup(primary: string[] | undefined): MuscleGroup {
  if (!primary || primary.length === 0) return "other";
  const key = primary[0]!.toLowerCase().trim();
  return MUSCLE_GROUP_MAP[key] ?? "other";
}

function mapEquipment(equipment: string | null | undefined): Equipment {
  if (!equipment) return "none";
  const key = equipment.toLowerCase().trim();
  return EQUIPMENT_MAP[key] ?? "other";
}

function buildPhotoUrl(ex: FreeExercise): string | null {
  // Prefer the dataset's own image array (it URL-encodes spaces correctly).
  if (ex.images && ex.images.length > 0) {
    return `${IMAGE_BASE}/${ex.images[0]}`.replace(/ /g, "%20");
  }
  if (!ex.id) return null;
  return `${IMAGE_BASE}/${encodeURIComponent(ex.id)}/0.jpg`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  setupAssociations();
  await sequelize.authenticate();

  // 1) Resolve a creator user.
  const adminWhere = ADMIN_EMAIL
    ? { email: ADMIN_EMAIL }
    : { role: "Admin" as const };
  const admin = await User.findOne({ where: adminWhere });
  if (!admin) {
    throw new Error(
      `No admin user found (looked for ${
        ADMIN_EMAIL ? `email=${ADMIN_EMAIL}` : "role=Admin"
      }). Pass --admin-email to override.`,
    );
  }
  logger.info(`Using creator: ${admin.email} (${admin.id})`);

  // 2) Fetch the source dataset (Node 18+ has global fetch).
  logger.info(`Fetching ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Source fetch failed: ${res.status} ${res.statusText}`);
  }
  const raw = (await res.json()) as FreeExercise[];
  logger.info(`Source has ${raw.length} exercises.`);

  // 3) Map to our model shape.
  const rows = raw
    .filter((ex) => ex.name && ex.name.trim().length > 0)
    .map((ex) => ({
      name: ex.name.slice(0, 255),
      muscleGroup: mapMuscleGroup(ex.primaryMuscles),
      equipment: mapEquipment(ex.equipment),
      videoUrl: null,
      videoThumbnail: null,
      photoUrl: buildPhotoUrl(ex),
      instructions: (ex.instructions ?? []).join("\n") || null,
      instructionsAr: null,
      isActive: true,
      createdBy: admin.id,
    }));

  logger.info(`Prepared ${rows.length} rows.`);

  if (DRY_RUN) {
    console.log("\n(DRY-RUN — nothing was written)");
    console.log("Sample:", JSON.stringify(rows.slice(0, 3), null, 2));
    await sequelize.close();
    return;
  }

  // 4) Insert. ignoreDuplicates skips rows that conflict on a unique constraint;
  //    the table has no unique on `name`, so this also acts as a "do not error
  //    on PK collision" guard if some rows already exist with the same UUID
  //    (UUIDs are auto-generated, so collisions are vanishingly unlikely).
  //    We also filter out names already present so we don't double-insert on
  //    re-run.
  const existing = await WellnessExercise.findAll({ attributes: ["name"] });
  const existingNames = new Set(existing.map((e) => e.name));
  const fresh = rows.filter((r) => !existingNames.has(r.name));

  logger.info(
    `${fresh.length} new (${rows.length - fresh.length} already present, skipped).`,
  );

  if (fresh.length === 0) {
    console.log("\nNothing to insert — exercises already seeded.");
    await sequelize.close();
    return;
  }

  // Chunked insert to keep statement size reasonable.
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < fresh.length; i += CHUNK) {
    const slice = fresh.slice(i, i + CHUNK);
    await WellnessExercise.bulkCreate(slice as any, { ignoreDuplicates: true });
    inserted += slice.length;
    logger.info(`  inserted ${inserted}/${fresh.length}`);
  }

  console.log("\n══════════════════════════════════════");
  console.log(" Exercise Seed Summary");
  console.log("══════════════════════════════════════");
  console.log(`  Source rows : ${raw.length}`);
  console.log(`  Mapped rows : ${rows.length}`);
  console.log(`  Inserted    : ${inserted}`);
  console.log(`  Skipped     : ${rows.length - fresh.length}`);
  console.log("══════════════════════════════════════\n");

  await sequelize.close();
}

main().catch((err) => {
  logger.error("Exercise seed failed:", err);
  process.exit(1);
});
