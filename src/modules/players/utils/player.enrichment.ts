// ─────────────────────────────────────────────────────────────
// src/modules/players/player.enrichment.ts
// Handles batch-fetching of related data (contracts, injuries,
// match stats) for a given set of player IDs.
//
// Why extracted?
// - The old listPlayers had ~40 lines of Promise.all + map
//   building mixed in with the main query logic.
// - Now the service calls `fetchEnrichmentMaps(playerIds)`
//   and gets back ready-to-use Maps.
// - If you ever need enrichment in another endpoint (e.g.
//   scouting shortlist), you can reuse this directly.
// ─────────────────────────────────────────────────────────────
import { Op, fn, col } from 'sequelize';
import { sequelize } from '../../../config/database';
import {
  RawContractRow,
  RawInjuryCountRow,
  RawPlayerStatsRow,
} from './player.types';
import {
  buildContractMap,
  buildInjuryMap,
  buildStatsMap,
} from './player.utils';
import { EnrichmentMaps } from './player.serializer';

/**
 * Given an array of player IDs, fires 3 parallel queries and
 * returns lookup Maps for contracts, injuries, and match stats.
 *
 * Each query is guarded by a model-existence check so the
 * service doesn't crash if a migration hasn't run yet.
 * (Though ideally you'd remove those guards once the schema
 * is stable.)
 */
export async function fetchEnrichmentMaps(playerIds: string[]): Promise<EnrichmentMaps> {
  const Contract = sequelize.models.Contract;
  const Injury = sequelize.models.Injury;
  const PlayerMatchStats = sequelize.models.PlayerMatchStats;

  const playerIdFilter = { [Op.in]: playerIds };

  const [contractRows, injuryRows, statsRows] = await Promise.all([
    // ── Active contracts (latest per player) ──
    Contract
      ? Contract.findAll({
          where: { playerId: playerIdFilter, status: 'Active' },
          attributes: ['playerId', 'endDate', 'agencyCommissionPercent'],
          raw: true,
        })
      : Promise.resolve([]),

    // ── Active injury count per player ──
    Injury
      ? Injury.findAll({
          where: { playerId: playerIdFilter, status: 'UnderTreatment' },
          attributes: ['playerId', [fn('COUNT', col('id')), 'count']],
          group: ['playerId'],
          raw: true,
        })
      : Promise.resolve([]),

    // ── Aggregated match stats per player ──
    PlayerMatchStats
      ? PlayerMatchStats.findAll({
          where: { playerId: playerIdFilter },
          attributes: [
            'playerId',
            [fn('COUNT', col('id')), 'matches'],
            [fn('SUM', col('goals')), 'goals'],
            [fn('SUM', col('assists')), 'assists'],
            [fn('SUM', col('minutes_played')), 'minutesPlayed'],
            [fn('AVG', col('rating')), 'avgRating'],
          ],
          group: ['playerId'],
          raw: true,
        })
      : Promise.resolve([]),
  ]);

  return {
    contractMap: buildContractMap(contractRows as unknown as RawContractRow[]),
    injuryMap: buildInjuryMap(injuryRows as unknown as RawInjuryCountRow[]),
    statsMap: buildStatsMap(statsRows as unknown as RawPlayerStatsRow[]),
  };
}