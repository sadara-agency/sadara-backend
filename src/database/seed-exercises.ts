// ─────────────────────────────────────────────────────────────
// src/database/seed-exercises.ts
//
// One-time import of ~800 exercises from yuhonas/free-exercise-db.
// Safe to re-run — uses ignoreDuplicates on name.
//
// Usage: npm run seed:exercises
// ─────────────────────────────────────────────────────────────

import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";
import { WellnessExercise } from "@modules/wellness/fitness.model";
import type { MuscleGroup, Equipment } from "@modules/wellness/fitness.model";

const EXERCISES_JSON_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const PHOTO_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

interface SourceExercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

function mapEquipment(raw: string | null): Equipment {
  switch (raw) {
    case "barbell":
      return "barbell";
    case "dumbbell":
      return "dumbbell";
    case "cable":
      return "cable";
    case "machine":
      return "machine";
    case "body only":
      return "bodyweight";
    case "kettlebells":
      return "kettlebell";
    case "bands":
      return "band";
    case "cardio":
      return "cardio_machine";
    default:
      return "other";
  }
}

function mapMuscleGroup(primaryMuscles: string[]): MuscleGroup {
  const primary = primaryMuscles[0] ?? "";
  switch (primary) {
    case "chest":
      return "chest";
    case "middle back":
    case "lower back":
    case "lats":
    case "traps":
      return "back";
    case "shoulders":
    case "neck":
      return "shoulders";
    case "biceps":
      return "biceps";
    case "triceps":
      return "triceps";
    case "forearms":
      return "forearms";
    case "abdominals":
    case "abductors":
    case "adductors":
      return "core";
    case "quadriceps":
      return "quads";
    case "hamstrings":
      return "hamstrings";
    case "glutes":
      return "glutes";
    case "calves":
      return "calves";
    case "full body":
      return "full_body";
    default:
      return "other";
  }
}

function mapLevel(raw: string): "beginner" | "intermediate" | "expert" | null {
  if (raw === "beginner" || raw === "intermediate" || raw === "expert")
    return raw;
  return null;
}

function mapForce(raw: string | null): "push" | "pull" | "static" | null {
  if (raw === "push" || raw === "pull" || raw === "static") return raw;
  return null;
}

function mapMechanic(raw: string | null): "compound" | "isolation" | null {
  if (raw === "compound" || raw === "isolation") return raw;
  return null;
}

async function main() {
  await sequelize.authenticate();
  console.log("DB connected — fetching exercises from free-exercise-db...");

  const admins = await sequelize.query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'Admin' LIMIT 1`,
    { type: QueryTypes.SELECT },
  );
  if (!admins.length)
    throw new Error(
      "No Admin user found — cannot seed exercises (created_by is NOT NULL)",
    );
  const adminId = admins[0].id;
  console.log(`Using admin user: ${adminId}`);

  const response = await fetch(EXERCISES_JSON_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch exercises: ${response.status} ${response.statusText}`,
    );
  }

  const source: SourceExercise[] = (await response.json()) as SourceExercise[];
  console.log(`Fetched ${source.length} exercises from source.`);

  const records = source.map((ex) => ({
    name: ex.name,
    muscleGroup: mapMuscleGroup(ex.primaryMuscles),
    equipment: mapEquipment(ex.equipment),
    instructions: ex.instructions.join("\n") || null,
    photoUrl: ex.images[0] ? `${PHOTO_BASE_URL}${ex.images[0]}` : null,
    level: mapLevel(ex.level),
    force: mapForce(ex.force),
    mechanic: mapMechanic(ex.mechanic),
    primaryMuscles: ex.primaryMuscles.length ? ex.primaryMuscles : null,
    secondaryMuscles: ex.secondaryMuscles.length ? ex.secondaryMuscles : null,
    isActive: true,
    createdBy: adminId,
  }));

  // ignoreDuplicates makes this idempotent; Sequelize uses ON CONFLICT DO NOTHING
  const result = await WellnessExercise.bulkCreate(records, {
    ignoreDuplicates: true,
    fields: [
      "name",
      "muscleGroup",
      "equipment",
      "instructions",
      "photoUrl",
      "level",
      "force",
      "mechanic",
      "primaryMuscles",
      "secondaryMuscles",
      "isActive",
    ],
  });

  const inserted = result.length;
  const skipped = source.length - inserted;
  console.log(`Done. Inserted: ${inserted} | Skipped (duplicates): ${skipped}`);

  await sequelize.close();
}

main().catch((err) => {
  console.error("seed-exercises failed:", err);
  process.exit(1);
});
