// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.rosters.sync.ts
//
// Phase C — persists Pulselive team rosters as Squad +
// SquadMembership rows. Resolves Sadara players via
// ExternalProviderMapping(provider='PulseLive'). Missing mappings
// are reported in `unmapped` so an operator can reconcile.
// ─────────────────────────────────────────────────────────────

import { logger } from "@config/logger";
import { Op } from "sequelize";
import { Club } from "@modules/clubs/club.model";
import { Squad } from "@modules/squads/squad.model";
import { SquadMembership } from "@modules/squads/squadMembership.model";
import { findOrCreateSquad } from "@modules/squads/squad.service";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";
import { fetchTeamStaff } from "@modules/spl/spl.rosters.pulselive";
import type { PulseLiveRosterPlayer } from "@modules/spl/spl.rosters.pulselive";
import { SPL_CLUB_REGISTRY } from "@modules/spl/spl.registry";
import { DEFAULT_SEASON_ID } from "@modules/spl/spl.pulselive";

const PROVIDER_NAME_EPM = "PulseLive";
const PROVIDER_SOURCE = "pulselive";

async function resolveClubId(pulseLiveTeamId: number): Promise<string | null> {
  // First try the new column on clubs (Phase C migration).
  const direct = (await Club.findOne({
    where: { pulseLiveTeamId },
    attributes: ["id"],
    raw: true,
  })) as { id: string } | null;
  if (direct) return direct.id;

  // Fallback: registry → splTeamId → club lookup
  const reg = SPL_CLUB_REGISTRY.find(
    (r) => r.pulseLiveTeamId === pulseLiveTeamId,
  );
  if (!reg) return null;
  const club = (await Club.findOne({
    where: {
      splTeamId: {
        [Op.in]: [Number(reg.splTeamId), reg.splTeamId as unknown as number],
      },
    },
    attributes: ["id"],
    raw: true,
  })) as { id: string } | null;
  return club?.id ?? null;
}

async function resolveSadaraPlayerId(
  pulseLivePlayerId: number,
): Promise<string | null> {
  const m = await ExternalProviderMapping.findOne({
    where: {
      providerName: PROVIDER_NAME_EPM,
      externalPlayerId: String(pulseLivePlayerId),
    },
  });
  return m?.playerId ?? null;
}

interface RosterSyncResult {
  squadId: string | null;
  clubId: string | null;
  members: number;
  unmappedPulseLivePlayerIds: number[];
  reason?: string;
}

export async function syncTeamRoster(
  pulseLiveTeamId: number,
  seasonId?: number,
): Promise<RosterSyncResult> {
  const compSeasonId = seasonId ?? DEFAULT_SEASON_ID;
  const seasonLabel = String(compSeasonId);

  const clubId = await resolveClubId(pulseLiveTeamId);
  if (!clubId) {
    return {
      squadId: null,
      clubId: null,
      members: 0,
      unmappedPulseLivePlayerIds: [],
      reason: "club_not_found",
    };
  }

  const roster = await fetchTeamStaff(pulseLiveTeamId, compSeasonId);
  if (roster.length === 0) {
    return {
      squadId: null,
      clubId,
      members: 0,
      unmappedPulseLivePlayerIds: [],
      reason: "empty_roster",
    };
  }

  const [squad] = await findOrCreateSquad(clubId, {
    ageCategory: "senior",
    division: null,
  });

  const unmapped: number[] = [];
  let members = 0;

  for (const pl of roster) {
    const plId = pl.playerId ?? pl.id;
    if (!plId) continue;
    const sadaraPlayerId = await resolveSadaraPlayerId(plId);
    if (!sadaraPlayerId) {
      unmapped.push(plId);
      continue;
    }

    const externalMembershipId = String(plId);
    const where = {
      squadId: squad.id,
      playerId: sadaraPlayerId,
      season: seasonLabel,
    };
    const existing = await SquadMembership.findOne({ where });
    const update = {
      jerseyNumber: typeof pl.shirtNum === "number" ? pl.shirtNum : null,
      position: pl.position ?? pl.positionInfo ?? null,
      joinedAt: pl.joinDate ?? null,
      externalMembershipId,
      providerSource: PROVIDER_SOURCE,
    };
    if (existing) {
      await existing.update(update);
    } else {
      await SquadMembership.create({
        squadId: squad.id,
        playerId: sadaraPlayerId,
        season: seasonLabel,
        ...update,
      });
    }
    members++;
  }

  logger.info(
    `[SPL rosters] team=${pulseLiveTeamId} season=${seasonLabel} members=${members} unmapped=${unmapped.length}`,
  );
  return {
    squadId: squad.id,
    clubId,
    members,
    unmappedPulseLivePlayerIds: unmapped,
  };
}

export async function syncAllTeamRosters(seasonId?: number): Promise<{
  teams: number;
  members: number;
  unmappedTotal: number;
  errors: number;
}> {
  let teams = 0;
  let members = 0;
  let unmappedTotal = 0;
  let errors = 0;

  for (const reg of SPL_CLUB_REGISTRY) {
    if (!reg.pulseLiveTeamId) continue;
    teams++;
    try {
      const r = await syncTeamRoster(reg.pulseLiveTeamId, seasonId);
      members += r.members;
      unmappedTotal += r.unmappedPulseLivePlayerIds.length;
    } catch (err) {
      errors++;
      logger.warn(
        `[SPL rosters] failed team=${reg.pulseLiveTeamId}: ${(err as Error).message}`,
      );
    }
  }

  return { teams, members, unmappedTotal, errors };
}

export type { PulseLiveRosterPlayer };
