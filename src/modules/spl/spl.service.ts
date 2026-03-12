// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.service.ts
// Service layer — club seeding, sync state.
// Club external IDs use Sequelize model columns (splTeamId, espnTeamId).
// ─────────────────────────────────────────────────────────────

import { Op, Sequelize } from "sequelize";
import { Club } from "@modules/clubs/club.model";
import {
  Competition,
  ClubCompetition,
} from "@modules/competitions/competition.model";
import { SPL_CLUB_REGISTRY } from "@modules/spl/spl.registry";

// ══════════════════════════════════════════
// SEED CLUB EXTERNAL IDS
// ══════════════════════════════════════════

export async function seedClubExternalIds(): Promise<{
  updated: number;
  notFound: string[];
}> {
  let updated = 0;
  const notFound: string[] = [];

  for (const entry of SPL_CLUB_REGISTRY) {
    const club = await Club.findOne({
      where: {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("name")),
            entry.nameEn.toLowerCase(),
          ),
          { name: { [Op.iLike]: `%${entry.nameEn}%` } },
          ...(entry.nameAr
            ? [{ nameAr: { [Op.like]: `%${entry.nameAr}%` } }]
            : []),
        ],
      },
    });

    if (club) {
      await club.update({
        splTeamId: parseInt(entry.splTeamId, 10),
        espnTeamId: parseInt(entry.espnTeamId, 10),
      });

      // Auto-enroll in Roshn Saudi League competition
      const splComp = await Competition.findOne({
        where: { name: "Roshn Saudi League" },
        attributes: ["id"],
      });
      if (splComp) {
        await ClubCompetition.findOrCreate({
          where: {
            clubId: club.id,
            competitionId: splComp.id,
            season: "2025-2026",
          },
          defaults: {
            clubId: club.id,
            competitionId: splComp.id,
            season: "2025-2026",
          },
        });
      }

      updated++;
      console.log(
        `[SPL Service] ✓ ${entry.nameEn} → spl=${entry.splTeamId} espn=${entry.espnTeamId}`,
      );
    } else {
      notFound.push(entry.nameEn);
      console.warn(`[SPL Service] ✗ No Sadara club for "${entry.nameEn}"`);
    }
  }

  return { updated, notFound };
}

// ══════════════════════════════════════════
// SYNC STATE (in-memory)
// ══════════════════════════════════════════

interface SyncState {
  isRunning: boolean;
  lastRun: Date | null;
  lastResult: any | null;
}

const state: SyncState = { isRunning: false, lastRun: null, lastResult: null };

export function getSyncState() {
  return { ...state };
}
export function updateSyncState(p: Partial<SyncState>) {
  Object.assign(state, p);
}
