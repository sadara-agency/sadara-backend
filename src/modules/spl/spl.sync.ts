// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.sync.ts
// Syncs scraped SPL data → Sadara DB.
//
// Target tables (from real schema):
//   performances — UNIQUE(player_id, season, competition)
//   external_provider_mappings — UNIQUE(player_id, provider_name)
//   players — bio fields
//   clubs — resolved via spl_team_id
//
// Dedup: ExternalProviderMapping first → fuzzy name+DOB fallback → create new
// Performances: raw SQL using ON CONFLICT (player_id, season, competition)
// ─────────────────────────────────────────────────────────────

import { Op, Sequelize } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";
import {
  scrapePlayerProfile,
  scrapeTeamRoster,
} from "@modules/spl/spl.scraper";
import { SPL_CLUB_REGISTRY } from "@modules/spl/spl.registry";
import {
  ScrapedPlayerFull,
  PlayerSyncResult,
  SplSyncSummary,
} from "@modules/spl/spl.types";
import { fetchPlayerStats } from "@modules/spl/spl.pulselive";

const PROVIDER_SPL = "SPL";
const PROVIDER_PULSELIVE = "PulseLive";

const POSITION_MAP: Record<string, string> = {
  goalkeeper: "GK",
  defender: "CB",
  midfielder: "CM",
  forward: "ST",
  striker: "ST",
  winger: "LW",
  "left back": "LB",
  "right back": "RB",
  "centre back": "CB",
  "center back": "CB",
  "central midfielder": "CM",
  "defensive midfielder": "CDM",
  "attacking midfielder": "CAM",
  "left winger": "LW",
  "right winger": "RW",
};

function normalizePosition(raw: string | null): string | null {
  if (!raw) return null;
  return POSITION_MAP[raw.toLowerCase().trim()] || raw;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const p = full.trim().split(/\s+/);
  return p.length === 1
    ? { firstName: p[0], lastName: "" }
    : { firstName: p[0], lastName: p.slice(1).join(" ") };
}

// ══════════════════════════════════════════
// RESOLVE PLAYER — find or create
// ══════════════════════════════════════════

async function resolvePlayer(
  scraped: ScrapedPlayerFull,
): Promise<PlayerSyncResult> {
  const { bio, currentSeasonStats } = scraped;
  const { firstName, lastName } = splitName(bio.fullName);

  // ── 1. Check ExternalProviderMapping ──
  const existing = await ExternalProviderMapping.findOne({
    where: { providerName: PROVIDER_SPL, externalPlayerId: bio.splPlayerId },
  });

  if (existing) {
    const player = await Player.findByPk(existing.playerId);
    if (!player) {
      return {
        splPlayerId: bio.splPlayerId,
        playerName: bio.fullName,
        sadaraPlayerId: existing.playerId,
        action: "skipped",
        reason: "Mapping exists but player missing",
      };
    }

    // Update fields that may have changed
    const updates: Record<string, any> = {};
    if (bio.photoUrl && !player.getDataValue("photoUrl"))
      updates.photoUrl = bio.photoUrl;
    if (bio.heightCm && !player.getDataValue("heightCm"))
      updates.heightCm = bio.heightCm;
    if (bio.jerseyNumber !== null) updates.jerseyNumber = bio.jerseyNumber;
    if (bio.position) updates.position = normalizePosition(bio.position);
    if (bio.splTeamId) {
      const club = await findClubBySplId(bio.splTeamId);
      if (club) updates.currentClubId = club.id;
    }
    if (Object.keys(updates).length > 0) await player.update(updates);
    await existing.update({ lastSyncedAt: new Date() });

    if (currentSeasonStats)
      await upsertPerformance(player.id, currentSeasonStats);
    return {
      splPlayerId: bio.splPlayerId,
      playerName: bio.fullName,
      sadaraPlayerId: player.id,
      action: "updated",
    };
  }

  // ── 2. Fuzzy match name + DOB ──
  const fuzzy = await findByNameDob(firstName, lastName, bio.dateOfBirth);
  if (fuzzy) {
    await createMappings(fuzzy.id, bio);
    await fuzzy.update({
      photoUrl: bio.photoUrl || fuzzy.getDataValue("photoUrl"),
      heightCm: bio.heightCm || fuzzy.getDataValue("heightCm"),
      jerseyNumber: bio.jerseyNumber ?? fuzzy.getDataValue("jerseyNumber"),
    });
    if (currentSeasonStats)
      await upsertPerformance(fuzzy.id, currentSeasonStats);
    return {
      splPlayerId: bio.splPlayerId,
      playerName: bio.fullName,
      sadaraPlayerId: fuzzy.id,
      action: "updated",
      reason: "Linked via name+DOB",
    };
  }

  // ── 3. Create new player ──
  const clubId = bio.splTeamId
    ? (await findClubBySplId(bio.splTeamId))?.id
    : null;
  const newPlayer = await Player.create({
    firstName,
    lastName,
    dateOfBirth: bio.dateOfBirth || "2000-01-01",
    nationality: bio.nationality || undefined,
    position: normalizePosition(bio.position) || undefined,
    heightCm: bio.heightCm || undefined,
    jerseyNumber: bio.jerseyNumber || undefined,
    photoUrl: bio.photoUrl || undefined,
    currentClubId: clubId || undefined,
    playerType: "Pro",
    status: "active",
  } as any);

  await createMappings(newPlayer.id, bio);
  if (currentSeasonStats)
    await upsertPerformance(newPlayer.id, currentSeasonStats);
  return {
    splPlayerId: bio.splPlayerId,
    playerName: bio.fullName,
    sadaraPlayerId: newPlayer.id,
    action: "created",
  };
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

async function findByNameDob(
  first: string,
  last: string,
  dob: string | null,
): Promise<Player | null> {
  const where: any = {
    [Op.and]: [
      Sequelize.where(
        Sequelize.fn("LOWER", Sequelize.col("first_name")),
        first.toLowerCase(),
      ),
      Sequelize.where(
        Sequelize.fn("LOWER", Sequelize.col("last_name")),
        last.toLowerCase(),
      ),
    ],
  };
  if (dob) where.dateOfBirth = dob;
  return Player.findOne({ where });
}

async function findClubBySplId(splTeamId: string): Promise<Club | null> {
  const entry = SPL_CLUB_REGISTRY.find((c) => c.splTeamId === splTeamId);
  // Try spl_team_id column first, then name fallback
  return Club.findOne({
    where: {
      [Op.or]: [
        { splTeamId: parseInt(splTeamId, 10) },
        ...(entry ? [{ name: { [Op.iLike]: `%${entry.nameEn}%` } }] : []),
      ],
    },
  });
}

async function createMappings(
  playerId: string,
  bio: ScrapedPlayerFull["bio"],
): Promise<void> {
  // Real constraint: UNIQUE(player_id, provider_name)
  await ExternalProviderMapping.upsert({
    playerId,
    providerName: PROVIDER_SPL,
    externalPlayerId: bio.splPlayerId,
    externalTeamId: bio.splTeamId || undefined,
    apiBaseUrl: `https://www.spl.com.sa/en/players/${bio.splPlayerId}/${bio.slug}`,
    lastSyncedAt: new Date(),
  } as any);

  if (bio.pulseLiveId) {
    await ExternalProviderMapping.upsert({
      playerId,
      providerName: PROVIDER_PULSELIVE,
      externalPlayerId: bio.pulseLiveId,
      apiBaseUrl: bio.photoUrl || undefined,
      lastSyncedAt: new Date(),
    } as any);
  }
}

// ── Performance upsert (raw SQL → real constraint) ──
// Real table: performances
// Real constraint: UNIQUE(player_id, season, competition)
// columns: appearances, starts, minutes, goals, assists, yellow_cards,
//   red_cards, clean_sheets, average_rating, xg, xa, key_passes,
//   successful_dribbles, aerial_duels_won, data_source, extended_stats

async function upsertPerformance(
  playerId: string,
  stats: NonNullable<ScrapedPlayerFull["currentSeasonStats"]>,
): Promise<void> {
  const season = "2025-2026";
  const competition = "Saudi Pro League";
  const starts = stats.appearances - stats.substitutions;

  await sequelize.query(
    `INSERT INTO performances (
       id, player_id, season, competition, data_source,
       appearances, starts, minutes, goals, assists,
       yellow_cards, red_cards, clean_sheets,
       average_rating, xg, xa, key_passes, successful_dribbles, aerial_duels_won,
       created_at, updated_at
     ) VALUES (
       gen_random_uuid(), :playerId, :season, :competition, :dataSource,
       :appearances, :starts, 0, :goals, :assists,
       :yellowCards, :redCards, 0,
       NULL, NULL, NULL, 0, 0, 0,
       NOW(), NOW()
     )
     ON CONFLICT (player_id, season, competition)
     DO UPDATE SET
       appearances = EXCLUDED.appearances,
       starts = EXCLUDED.starts,
       goals = EXCLUDED.goals,
       assists = EXCLUDED.assists,
       yellow_cards = EXCLUDED.yellow_cards,
       red_cards = EXCLUDED.red_cards,
       data_source = EXCLUDED.data_source,
       updated_at = NOW()`,
    {
      replacements: {
        playerId,
        season,
        competition,
        dataSource: "SPL",
        appearances: stats.appearances,
        starts,
        goals: stats.goals,
        assists: stats.assists,
        yellowCards: stats.yellowCards,
        redCards: stats.redCards,
      },
    },
  );
}

// ── PulseLive detailed stats upsert ──
// Maps 155+ PulseLive metrics → structured columns + extended_stats JSONB

const PL_STAT_MAP: Record<string, string> = {
  appearances: "appearances",
  games_started: "starts",
  mins_played: "minutes",
  goals: "goals",
  goal_assist: "assists",
  yellow_card: "yellow_cards",
  red_card: "red_cards",
  clean_sheet: "clean_sheets",
  aerial_won: "aerial_duels_won",
};

export async function upsertDetailedPerformance(
  playerId: string,
  plStats: Record<string, number>,
  season = "2025-2026",
): Promise<void> {
  const competition = "Saudi Pro League";

  const appearances = plStats.appearances ?? 0;
  const starts = plStats.games_started ?? 0;
  const minutes = plStats.mins_played ?? 0;
  const goals = plStats.goals ?? 0;
  const assists = plStats.goal_assist ?? 0;
  const yellowCards = plStats.yellow_card ?? 0;
  const redCards = plStats.red_card ?? 0;
  const cleanSheets = plStats.clean_sheet ?? 0;
  const aerialDuelsWon = plStats.aerial_won ?? 0;
  const keyPasses = plStats.big_chance_created ?? 0;
  const successfulDribbles = plStats.successful_final_third_passes ?? 0;

  await sequelize.query(
    `INSERT INTO performances (
       id, player_id, season, competition, data_source,
       appearances, starts, minutes, goals, assists,
       yellow_cards, red_cards, clean_sheets,
       average_rating, xg, xa, key_passes, successful_dribbles, aerial_duels_won,
       extended_stats,
       created_at, updated_at
     ) VALUES (
       gen_random_uuid(), :playerId, :season, :competition, 'PulseLive',
       :appearances, :starts, :minutes, :goals, :assists,
       :yellowCards, :redCards, :cleanSheets,
       NULL, NULL, NULL, :keyPasses, :successfulDribbles, :aerialDuelsWon,
       :extendedStats::jsonb,
       NOW(), NOW()
     )
     ON CONFLICT (player_id, season, competition)
     DO UPDATE SET
       appearances = EXCLUDED.appearances,
       starts = EXCLUDED.starts,
       minutes = EXCLUDED.minutes,
       goals = EXCLUDED.goals,
       assists = EXCLUDED.assists,
       yellow_cards = EXCLUDED.yellow_cards,
       red_cards = EXCLUDED.red_cards,
       clean_sheets = EXCLUDED.clean_sheets,
       key_passes = EXCLUDED.key_passes,
       successful_dribbles = EXCLUDED.successful_dribbles,
       aerial_duels_won = EXCLUDED.aerial_duels_won,
       extended_stats = EXCLUDED.extended_stats,
       data_source = 'PulseLive',
       updated_at = NOW()`,
    {
      replacements: {
        playerId,
        season,
        competition,
        appearances,
        starts,
        minutes,
        goals,
        assists,
        yellowCards,
        redCards,
        cleanSheets,
        keyPasses,
        successfulDribbles,
        aerialDuelsWon,
        extendedStats: JSON.stringify(plStats),
      },
    },
  );
}

// ── Sync detailed stats for a single player via PulseLive ──

export async function syncPlayerDetailedStats(
  playerId: string,
  pulseLivePlayerId: number,
  season?: string,
): Promise<boolean> {
  const result = await fetchPlayerStats(pulseLivePlayerId);
  if (!result) {
    logger.debug(
      `[PulseLive Sync] No stats for player PL#${pulseLivePlayerId}`,
    );
    return false;
  }

  await upsertDetailedPerformance(playerId, result.stats, season);
  logger.debug(
    `[PulseLive Sync] ✓ ${result.entity.name?.display ?? pulseLivePlayerId}: ${Object.keys(result.stats).length} stats`,
  );
  return true;
}

// ── Sync detailed stats for ALL players with PulseLive mappings ──

export async function syncAllDetailedStats(
  onProgress?: (name: string, i: number, total: number) => void,
): Promise<{
  total: number;
  synced: number;
  skipped: number;
  errors: number;
}> {
  // Find all players with a PulseLive mapping
  const mappings = await ExternalProviderMapping.findAll({
    where: { providerName: PROVIDER_PULSELIVE, isActive: true },
  });

  let synced = 0,
    skipped = 0,
    errors = 0;

  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    const plId = parseInt(m.externalPlayerId, 10);
    if (isNaN(plId)) {
      skipped++;
      continue;
    }

    try {
      if (onProgress) onProgress(m.externalPlayerId, i, mappings.length);
      const ok = await syncPlayerDetailedStats(m.playerId, plId);
      if (ok) synced++;
      else skipped++;
    } catch (err: any) {
      logger.error(`[PulseLive Sync] Error PL#${plId}: ${err.message}`);
      errors++;
    }
  }

  logger.info(
    `[PulseLive Sync] ✓ Complete: ${synced} synced, ${skipped} skipped, ${errors} errors`,
  );
  return { total: mappings.length, synced, skipped, errors };
}

// ══════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════

export async function syncPlayer(
  splPlayerId: string,
  slug?: string,
): Promise<PlayerSyncResult> {
  const scraped = await scrapePlayerProfile(splPlayerId, slug || "player");
  if (!scraped)
    return {
      splPlayerId,
      playerName: "Unknown",
      sadaraPlayerId: "",
      action: "skipped",
      reason: "Profile not found",
    };
  return resolvePlayer(scraped);
}

export async function syncTeam(splTeamId: string): Promise<SplSyncSummary> {
  const start = Date.now();
  const results: PlayerSyncResult[] = [];
  let created = 0,
    updated = 0,
    skipped = 0,
    errors = 0;

  const roster = await scrapeTeamRoster(splTeamId);
  logger.info(`[SPL Sync] Team ${splTeamId}: ${roster.length} players`);

  for (let i = 0; i < roster.length; i++) {
    const { splPlayerId, slug, name } = roster[i];
    try {
      const scraped = await scrapePlayerProfile(splPlayerId, slug);
      if (!scraped) {
        results.push({
          splPlayerId,
          playerName: name,
          sadaraPlayerId: "",
          action: "skipped",
          reason: "No data",
        });
        skipped++;
        continue;
      }
      const r = await resolvePlayer(scraped);
      results.push(r);
      if (r.action === "created") created++;
      else if (r.action === "updated") updated++;
      else skipped++;
    } catch (err: any) {
      logger.error(`[SPL Sync] Error ${name}: ${err.message}`);
      results.push({
        splPlayerId,
        playerName: name,
        sadaraPlayerId: "",
        action: "skipped",
        reason: err.message,
      });
      errors++;
    }
    if (i < roster.length - 1) await new Promise((r) => setTimeout(r, 1500));
  }

  const summary: SplSyncSummary = {
    total: roster.length,
    created,
    updated,
    skipped,
    errors,
    results,
    syncedAt: new Date(),
    durationMs: Date.now() - start,
  };
  logger.info(
    `[SPL Sync] ✓ Team ${splTeamId}: ${created}c ${updated}u ${skipped}s ${errors}e (${summary.durationMs}ms)`,
  );
  return summary;
}

export async function syncAllTeams(
  onProgress?: (name: string, i: number, total: number) => void,
): Promise<{
  teams: number;
  totalPlayers: number;
  created: number;
  updated: number;
  errors: number;
}> {
  let total = 0,
    c = 0,
    u = 0,
    e = 0;
  for (let i = 0; i < SPL_CLUB_REGISTRY.length; i++) {
    const club = SPL_CLUB_REGISTRY[i];
    if (onProgress) onProgress(club.nameEn, i, SPL_CLUB_REGISTRY.length);
    logger.info(
      `[SPL Sync] ── ${club.nameEn} (${i + 1}/${SPL_CLUB_REGISTRY.length}) ──`,
    );
    try {
      const s = await syncTeam(club.splTeamId);
      total += s.total;
      c += s.created;
      u += s.updated;
      e += s.errors;
    } catch (err: any) {
      logger.error(`[SPL Sync] ✗ ${club.nameEn}: ${err.message}`);
      e++;
    }
    if (i < SPL_CLUB_REGISTRY.length - 1)
      await new Promise((r) => setTimeout(r, 3000));
  }
  return {
    teams: SPL_CLUB_REGISTRY.length,
    totalPlayers: total,
    created: c,
    updated: u,
    errors: e,
  };
}
