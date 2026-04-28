// ─────────────────────────────────────────────────────────────
// scripts/backfillPositionTemplate.ts
//
// One-shot backfill for the TIPS scout-report upgrade (migration 182).
// Walks every watchlist row whose position_template is NULL and runs
// freeformToTemplate() against the freeform position string. Sets the
// template only when the heuristic returns a confident match — rows that
// stay null can be filled in later either by editing the prospect or by
// re-running the script after improving the heuristic.
//
// Idempotent: skips rows where position_template is already set.
//
// Run with:
//   npx ts-node -r tsconfig-paths/register src/scripts/backfillPositionTemplate.ts
// ─────────────────────────────────────────────────────────────
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import { Watchlist } from "@modules/scouting/scouting.model";
import { freeformToTemplate } from "@modules/scouting/positionTemplate";

async function run(): Promise<void> {
  const rows = await Watchlist.findAll({
    where: { positionTemplate: null },
    attributes: ["id", "position", "positionTemplate"],
  });

  let resolved = 0;
  let skipped = 0;
  let unresolved = 0;

  for (const row of rows) {
    const template = freeformToTemplate(row.position);
    if (template === null) {
      unresolved++;
      continue;
    }
    if (row.positionTemplate === template) {
      skipped++;
      continue;
    }
    await row.update({ positionTemplate: template });
    resolved++;
  }

  logger.info("[backfillPositionTemplate] complete", {
    total: rows.length,
    resolved,
    unresolved,
    skipped,
  });
}

run()
  .then(() => sequelize.close())
  .catch((err) => {
    logger.error("[backfillPositionTemplate] failed", { err });
    return sequelize.close().finally(() => process.exit(1));
  });
