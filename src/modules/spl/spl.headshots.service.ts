// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.headshots.service.ts
//
// Phase D — backfills `players.photo_url` from Pulselive headshots
// for every player that has a PulseLive provider mapping but no
// existing photo. HEAD-checks each URL so we don't save broken links.
//
// URL pattern: https://static-files.saudi-pro-league.pulselive.com/players/headshot/{pulseLiveId}
// ─────────────────────────────────────────────────────────────

import axios from "axios";
import { Op } from "sequelize";
import { logger } from "@config/logger";
import { Player } from "@modules/players/player.model";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";

const HEADSHOT_BASE =
  "https://static-files.saudi-pro-league.pulselive.com/players/headshot";

function urlFor(pulseLiveId: string | number): string {
  return `${HEADSHOT_BASE}/${pulseLiveId}`;
}

async function headExists(url: string): Promise<boolean> {
  try {
    const r = await axios.head(url, { timeout: 8_000 });
    return r.status >= 200 && r.status < 300;
  } catch {
    return false;
  }
}

export async function ingestHeadshotsForPlayersMissingPhoto(): Promise<{
  checked: number;
  updated: number;
  skipped: number;
  notFound: number;
}> {
  const candidates = await ExternalProviderMapping.findAll({
    where: {
      providerName: "PulseLive",
      externalPlayerId: { [Op.ne]: null as unknown as string },
    },
    raw: true,
  });

  let checked = 0;
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const m of candidates) {
    checked++;
    const player = await Player.findByPk(m.playerId);
    if (!player) {
      skipped++;
      continue;
    }
    if (player.getDataValue("photoUrl")) {
      skipped++;
      continue;
    }
    const url = urlFor(m.externalPlayerId);
    const ok = await headExists(url);
    if (!ok) {
      notFound++;
      continue;
    }
    await player.update({ photoUrl: url });
    updated++;
  }

  logger.info(
    `[SPL headshots] checked=${checked} updated=${updated} skipped=${skipped} notFound=${notFound}`,
  );
  return { checked, updated, skipped, notFound };
}
