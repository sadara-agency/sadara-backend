import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";

export interface TransferFrameworkStats {
  dealCount: number;
  shortlistedCount: number;
  feePipelineSar: number;
  tierCounts: { A: number; B: number; C: number };
  phaseCounts: { phase: string; count: number }[];
}

export async function getTransferFrameworkStats(
  windowId?: string,
): Promise<TransferFrameworkStats> {
  const windowFilter = windowId ? `AND o.window_id = :windowId` : "";
  const replacements = windowId ? { windowId } : {};

  const tierRows = await sequelize.query<{ package: string; count: string }>(
    `SELECT player_package AS package, COUNT(*) AS count
     FROM players
     WHERE player_package IN ('A','B','C') AND status = 'Active'
     GROUP BY player_package`,
    { type: QueryTypes.SELECT, replacements: {} },
  );

  const dealRows = await sequelize.query<{ count: string; fee_sum: string }>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(transfer_fee), 0) AS fee_sum
     FROM offers o
     WHERE o.status NOT IN ('Closed','Withdrawn') ${windowFilter}`,
    { type: QueryTypes.SELECT, replacements },
  );

  const phaseRows = await sequelize.query<{ phase: string; count: string }>(
    `SELECT COALESCE(phase,'ID') AS phase, COUNT(*) AS count
     FROM offers o
     WHERE o.status NOT IN ('Closed','Withdrawn') ${windowFilter}
     GROUP BY COALESCE(phase,'ID')`,
    { type: QueryTypes.SELECT, replacements },
  );

  const shortlistRows = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM scoring_cards
     WHERE is_shortlisted = true${windowId ? " AND window_id = :windowId" : ""}`,
    { type: QueryTypes.SELECT, replacements },
  );

  const tiers = tierRows.reduce(
    (acc, r) => ({ ...acc, [r.package]: Number(r.count) }),
    { A: 0, B: 0, C: 0 },
  );

  return {
    dealCount: Number(dealRows[0]?.count ?? 0),
    feePipelineSar: Number(dealRows[0]?.fee_sum ?? 0),
    shortlistedCount: Number(shortlistRows[0]?.count ?? 0),
    tierCounts: tiers as { A: number; B: number; C: number },
    phaseCounts: phaseRows.map((r) => ({
      phase: r.phase,
      count: Number(r.count),
    })),
  };
}
