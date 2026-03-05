// 000_baseline.ts
// Baseline migration — wraps existing schema.ts as the first tracked migration.
// All operations are idempotent (IF NOT EXISTS, etc.) so safe for existing databases.

import { createMissingTables, createViews } from "../schema";

export async function up() {
  await createMissingTables();
  await createViews();
}

export async function down() {
  // No-op — dropping all tables would be destructive
  console.warn("Baseline migration down() is a no-op");
}
