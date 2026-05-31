import { AppError } from "@middleware/errorHandler";
import { Match } from "@modules/matches/match.model";
import { MatchEventTag } from "./matchEventTag.model";
import type {
  CreateEventTagDTO,
  ListEventTagsQuery,
} from "./matchEventTag.validation";

async function ensureMatch(matchId: string): Promise<void> {
  const match = await Match.findByPk(matchId);
  if (!match) throw new AppError("Match not found", 404);
}

export async function listTagsForMatch(
  matchId: string,
  query: ListEventTagsQuery,
) {
  await ensureMatch(matchId);
  const where: { matchId: string; playerId?: string } = { matchId };
  if (query.playerId) where.playerId = query.playerId;
  const tags = await MatchEventTag.findAll({
    where,
    order: [["timestampSec", "ASC"]],
  });
  return tags;
}

export async function createTag(
  matchId: string,
  data: CreateEventTagDTO,
  userId: string,
) {
  await ensureMatch(matchId);
  return MatchEventTag.create({ ...data, matchId, createdBy: userId });
}

export async function deleteTag(id: string) {
  const tag = await MatchEventTag.findByPk(id);
  if (!tag) throw new AppError("Event tag not found", 404);
  await tag.destroy();
  return { id };
}

/**
 * Per-player aggregation of a match's event tags. Mirrors
 * getTagSummaryForClip but groups by player first, then tag type — the
 * shape the analyst review/commit table consumes.
 */
export async function getSummaryForMatch(matchId: string) {
  await ensureMatch(matchId);
  const tags = await MatchEventTag.findAll({ where: { matchId } });

  const byPlayer = new Map<string, Record<string, number>>();
  for (const tag of tags) {
    const counts = byPlayer.get(tag.playerId) ?? {};
    counts[tag.tagType] = (counts[tag.tagType] ?? 0) + 1;
    byPlayer.set(tag.playerId, counts);
  }

  const players = Array.from(byPlayer.entries()).map(([playerId, byType]) => ({
    playerId,
    total: Object.values(byType).reduce((a, b) => a + b, 0),
    byType,
  }));

  return { matchId, total: tags.length, players };
}
