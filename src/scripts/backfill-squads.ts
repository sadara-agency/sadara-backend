// ─────────────────────────────────────────────────────────────
// scripts/backfill-squads.ts
//
// One-shot backfill for the SAFF Club/Squad refactor (Phase 2):
//
//   1. Create one (senior, premier) squad per existing club.
//   2. Set matches.home_squad_id / away_squad_id from the senior squad
//      of matches.home_club_id / away_club_id.
//   3. Set match_players.squad_id to the senior squad of the match's
//      home or away club, depending on which side the player belongs to
//      (via contracts.club_id; falls back to home if unknown).
//   4. Set contracts.squad_id to the senior squad of contracts.club_id.
//   5. Set saff_team_maps.squad_id to the senior squad of
//      saff_team_maps.club_id (tournament_id stays NULL — Phase 3).
//
// All updates run in 5,000-row chunks inside per-batch transactions
// so we don't hold long locks on match_players. Idempotent: re-running
// only touches rows that still have NULL squad references.
//
// Run with:
//   npx ts-node -r tsconfig-paths/register src/scripts/backfill-squads.ts
// ─────────────────────────────────────────────────────────────
import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import "@modules/squads/squad.model"; // ensure model is registered

const BATCH_SIZE = 5000;

async function ensureSeniorSquadsForAllClubs(): Promise<number> {
  // Insert one (senior, premier) squad per club that doesn't yet have one.
  // Display name mirrors the club name for the default squad — matches the
  // composeDisplayName() rule in squad.service.
  const [result, meta] = await sequelize.query(
    `
    INSERT INTO squads
      (id, club_id, age_category, division, display_name, display_name_ar,
       is_active, created_at, updated_at)
    SELECT
      gen_random_uuid(), c.id, 'senior', 'premier',
      c.name, COALESCE(c.name_ar, c.name),
      true, NOW(), NOW()
    FROM clubs c
    WHERE c.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM squads s
        WHERE s.club_id = c.id
          AND s.age_category = 'senior'
          AND COALESCE(s.division, '') = 'premier'
      )
    `,
    { type: QueryTypes.INSERT },
  );
  // INSERT returns rowCount via the metadata object on pg.
  return (
    (meta as { rowCount?: number } | undefined)?.rowCount ??
    (Array.isArray(result) ? result.length : 0)
  );
}

async function backfillTable(
  label: string,
  // SQL must take :batchSize binding and update at most that many rows
  // returning the number actually updated.
  updateSql: string,
): Promise<number> {
  let total = 0;
  // Loop until a batch updates zero rows. The CTE pattern below is
  // already chunked by LIMIT, so we just iterate.
  for (;;) {
    const txn = await sequelize.transaction();
    try {
      const [, batchMeta] = await sequelize.query(updateSql, {
        replacements: { batchSize: BATCH_SIZE },
        transaction: txn,
      });
      await txn.commit();
      const updated =
        (batchMeta as { rowCount?: number } | undefined)?.rowCount ?? 0;
      total += updated;
      logger.info(`[backfill-squads] ${label}: +${updated} (running ${total})`);
      if (updated === 0) break;
    } catch (err) {
      await txn.rollback();
      throw err;
    }
  }
  return total;
}

async function backfillMatchesHome(): Promise<number> {
  return backfillTable(
    "matches.home_squad_id",
    `
    WITH batch AS (
      SELECT m.id, s.id AS squad_id
      FROM matches m
      JOIN squads s ON s.club_id = m.home_club_id
        AND s.age_category = 'senior'
        AND COALESCE(s.division, '') = 'premier'
      WHERE m.home_squad_id IS NULL AND m.home_club_id IS NOT NULL
      LIMIT :batchSize
    )
    UPDATE matches
    SET home_squad_id = batch.squad_id, updated_at = NOW()
    FROM batch
    WHERE matches.id = batch.id
    `,
  );
}

async function backfillMatchesAway(): Promise<number> {
  return backfillTable(
    "matches.away_squad_id",
    `
    WITH batch AS (
      SELECT m.id, s.id AS squad_id
      FROM matches m
      JOIN squads s ON s.club_id = m.away_club_id
        AND s.age_category = 'senior'
        AND COALESCE(s.division, '') = 'premier'
      WHERE m.away_squad_id IS NULL AND m.away_club_id IS NOT NULL
      LIMIT :batchSize
    )
    UPDATE matches
    SET away_squad_id = batch.squad_id, updated_at = NOW()
    FROM batch
    WHERE matches.id = batch.id
    `,
  );
}

async function backfillContracts(): Promise<number> {
  return backfillTable(
    "contracts.squad_id",
    `
    WITH batch AS (
      SELECT c.id, s.id AS squad_id
      FROM contracts c
      JOIN squads s ON s.club_id = c.club_id
        AND s.age_category = 'senior'
        AND COALESCE(s.division, '') = 'premier'
      WHERE c.squad_id IS NULL AND c.club_id IS NOT NULL
      LIMIT :batchSize
    )
    UPDATE contracts
    SET squad_id = batch.squad_id, updated_at = NOW()
    FROM batch
    WHERE contracts.id = batch.id
    `,
  );
}

async function backfillMatchPlayers(): Promise<number> {
  // Resolve squad via the player's active contract club where possible;
  // fall back to the match's home squad otherwise (legacy rows without
  // contracts shouldn't end up linked to no squad at all).
  return backfillTable(
    "match_players.squad_id",
    `
    WITH batch AS (
      SELECT mp.id,
             COALESCE(
               (SELECT s.id FROM contracts ct
                JOIN squads s ON s.club_id = ct.club_id
                  AND s.age_category = 'senior'
                  AND COALESCE(s.division, '') = 'premier'
                WHERE ct.player_id = mp.player_id
                  AND ct.status = 'Active'
                ORDER BY ct.end_date DESC
                LIMIT 1),
               m.home_squad_id
             ) AS squad_id
      FROM match_players mp
      JOIN matches m ON m.id = mp.match_id
      WHERE mp.squad_id IS NULL
      LIMIT :batchSize
    )
    UPDATE match_players
    SET squad_id = batch.squad_id, updated_at = NOW()
    FROM batch
    WHERE match_players.id = batch.id
      AND batch.squad_id IS NOT NULL
    `,
  );
}

async function backfillSaffTeamMaps(): Promise<number> {
  return backfillTable(
    "saff_team_maps.squad_id",
    `
    WITH batch AS (
      SELECT stm.id, s.id AS squad_id
      FROM saff_team_maps stm
      JOIN squads s ON s.club_id = stm.club_id
        AND s.age_category = 'senior'
        AND COALESCE(s.division, '') = 'premier'
      WHERE stm.squad_id IS NULL AND stm.club_id IS NOT NULL
      LIMIT :batchSize
    )
    UPDATE saff_team_maps
    SET squad_id = batch.squad_id, updated_at = NOW()
    FROM batch
    WHERE saff_team_maps.id = batch.id
    `,
  );
}

export async function runBackfill() {
  await sequelize.authenticate();
  logger.info("[backfill-squads] Connected to DB");

  const created = await ensureSeniorSquadsForAllClubs();
  logger.info(`[backfill-squads] Created ${created} senior/premier squads`);

  const homeCount = await backfillMatchesHome();
  const awayCount = await backfillMatchesAway();
  const contractsCount = await backfillContracts();
  const teamMapsCount = await backfillSaffTeamMaps();
  // match_players last — largest table, longest run.
  const matchPlayersCount = await backfillMatchPlayers();

  logger.info("[backfill-squads] Summary", {
    squadsCreated: created,
    matchesHome: homeCount,
    matchesAway: awayCount,
    contracts: contractsCount,
    saffTeamMaps: teamMapsCount,
    matchPlayers: matchPlayersCount,
  });
}

if (require.main === module) {
  runBackfill()
    .then(async () => {
      await sequelize.close();
      process.exit(0);
    })
    .catch(async (err: unknown) => {
      logger.error("[backfill-squads] Failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      await sequelize.close().catch(() => undefined);
      process.exit(1);
    });
}
