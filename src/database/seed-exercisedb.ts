// ─────────────────────────────────────────────────────────────
// src/database/seed-exercisedb.ts
//
// One-time import of exercises from the ExerciseDB OSS API.
// Safe to re-run — upserts by external_db_id (ON CONFLICT DO UPDATE).
//
// Usage: npm run seed:exercisedb
// ─────────────────────────────────────────────────────────────

import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";
import { WellnessExercise } from "@modules/wellness/fitness.model";
import type { MuscleGroup, Equipment } from "@modules/wellness/fitness.model";

const EXERCISEDB_BASE_URL =
  process.env.EXERCISEDB_BASE_URL ?? "https://oss.exercisedb.dev/api/v1";

// Actual OSS API response shape (fields differ from the RapidAPI docs)
interface ExerciseDBExercise {
  exerciseId: string;
  name: string;
  bodyParts: string[]; // e.g. ["CHEST"]
  targetMuscles: string[]; // e.g. ["Pectoralis Major Clavicular Head"]
  secondaryMuscles: string[];
  equipments: string[]; // e.g. ["LEVERAGE MACHINE"]
  instructions: string[];
  gifUrl?: string; // full GIF URL provided directly by the API
  imageUrl?: string; // fallback filename only
}

function mapEquipment(equipments: string[]): Equipment {
  const raw = (equipments[0] ?? "").toUpperCase();
  if (raw.includes("BARBELL")) return "barbell";
  if (raw.includes("DUMBBELL")) return "dumbbell";
  if (raw.includes("CABLE")) return "cable";
  if (
    raw.includes("LEVERAGE") ||
    raw.includes("SMITH") ||
    raw.includes("MACHINE")
  )
    return "machine";
  if (raw.includes("BODY") || raw.includes("BODYWEIGHT")) return "bodyweight";
  if (raw.includes("KETTLEBELL")) return "kettlebell";
  if (raw.includes("BAND") || raw.includes("RESISTANCE")) return "band";
  if (raw.includes("CARDIO")) return "cardio_machine";
  return "other";
}

function mapMuscleGroup(
  bodyParts: string[],
  targetMuscles: string[],
): MuscleGroup {
  const part = (bodyParts[0] ?? "").toUpperCase();
  const target = (targetMuscles[0] ?? "").toUpperCase();

  if (part.includes("CHEST") || target.includes("PECTORAL")) return "chest";
  if (
    part.includes("BACK") ||
    target.includes("LAT") ||
    target.includes("TRAPEZIUS") ||
    target.includes("RHOMBOID")
  )
    return "back";
  if (part.includes("SHOULDER") || target.includes("DELTOID"))
    return "shoulders";
  if (target.includes("BICEP")) return "biceps";
  if (target.includes("TRICEP")) return "triceps";
  if (
    part.includes("FOREARM") ||
    target.includes("FOREARM") ||
    target.includes("BRACHIORADIALIS")
  )
    return "forearms";
  if (
    part.includes("WAIST") ||
    target.includes("ABS") ||
    target.includes("OBLIQUE") ||
    target.includes("ABDOMINAL")
  )
    return "core";
  if (
    part.includes("UPPER LEG") ||
    target.includes("QUAD") ||
    target.includes("HAMSTRING")
  ) {
    if (target.includes("HAMSTRING")) return "hamstrings";
    if (target.includes("GLUTE")) return "glutes";
    return "quads";
  }
  if (
    part.includes("LOWER LEG") ||
    target.includes("CALF") ||
    target.includes("GASTROCNEMIUS") ||
    target.includes("SOLEUS")
  )
    return "calves";
  if (part.includes("UPPER ARM")) {
    if (target.includes("BICEP")) return "biceps";
    if (target.includes("TRICEP")) return "triceps";
    return "shoulders";
  }
  if (part.includes("CARDIO")) return "cardio";
  if (part.includes("FULL") || target.includes("FULL")) return "full_body";
  return "other";
}

async function fetchAllExercises(): Promise<ExerciseDBExercise[]> {
  // limit=0 should return all; some deployments may ignore it and paginate.
  // We fetch page by page if the response looks paginated.
  const url = `${EXERCISEDB_BASE_URL}/exercises?limit=0&offset=0`;
  console.log(`Fetching exercises from ${url}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `ExerciseDB fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as
    | ExerciseDBExercise[]
    | { data: ExerciseDBExercise[] };

  // API may return array directly or wrapped in { data: [] }
  const list = Array.isArray(payload)
    ? payload
    : (payload as { data: ExerciseDBExercise[] }).data;

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      `Unexpected API response shape. Got: ${JSON.stringify(payload).slice(0, 200)}`,
    );
  }

  // Log the first item so we can validate field names in future runs
  console.log("Sample exercise fields:", Object.keys(list[0]).join(", "));

  return list;
}

async function main() {
  await sequelize.authenticate();
  console.log("DB connected.");

  // Try to find an Admin user; fall back to the well-known seed UUID when
  // running against a freshly migrated DB that hasn't been seeded yet.
  const FALLBACK_ADMIN_ID = "a0000001-0000-0000-0000-000000000001";
  let adminId = FALLBACK_ADMIN_ID;
  try {
    const admins = await sequelize.query<{ id: string }>(
      `SELECT id FROM users WHERE role = 'Admin' LIMIT 1`,
      { type: QueryTypes.SELECT },
    );
    if (admins.length) adminId = admins[0].id;
  } catch {
    // users table doesn't exist yet — use fallback
  }
  console.log(`Using admin user: ${adminId}`);

  const source = await fetchAllExercises();
  console.log(`Fetched ${source.length} exercises from ExerciseDB OSS.`);

  const records = source.map((ex) => ({
    name: ex.name,
    muscleGroup: mapMuscleGroup(ex.bodyParts ?? [], ex.targetMuscles ?? []),
    equipment: mapEquipment(ex.equipments ?? []),
    primaryMuscles: (ex.targetMuscles ?? []).length ? ex.targetMuscles : null,
    secondaryMuscles: (ex.secondaryMuscles ?? []).length
      ? ex.secondaryMuscles
      : null,
    instructions: (ex.instructions ?? []).length
      ? ex.instructions.join("\n")
      : null,
    // Prefer the gifUrl provided directly by the API; fall back to constructing it
    gifUrl:
      ex.gifUrl ??
      (ex.exerciseId
        ? `${EXERCISEDB_BASE_URL}/image?exerciseId=${ex.exerciseId}&resolution=180`
        : null),
    externalDbId: ex.exerciseId ?? null,
    isActive: true,
    createdBy: adminId,
  }));

  // Filter out any records that somehow still have no externalDbId
  const valid = records.filter((r) => r.externalDbId !== null);
  if (valid.length !== records.length) {
    console.warn(
      `Warning: ${records.length - valid.length} exercises skipped (missing exerciseId).`,
    );
  }

  // Upsert: if external_db_id already exists, update enrichment fields.
  await WellnessExercise.bulkCreate(valid, {
    updateOnDuplicate: [
      "name",
      "muscleGroup",
      "equipment",
      "primaryMuscles",
      "secondaryMuscles",
      "instructions",
      "gifUrl",
    ],
    ignoreDuplicates: false,
  });

  console.log(`Done. Upserted ${valid.length} exercises from ExerciseDB OSS.`);
  console.log(
    "GIF previews load on demand from https://oss.exercisedb.dev — no hosting required.",
  );

  await sequelize.close();
}

main().catch((err) => {
  console.error("seed-exercisedb failed:", err);
  process.exit(1);
});
