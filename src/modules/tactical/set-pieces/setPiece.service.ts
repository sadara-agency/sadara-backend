import { SetPiece } from "./setPiece.model";
import { Match } from "@modules/matches/match.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateSetPieceInput,
  UpdateSetPieceInput,
  SetPieceQuery,
} from "./setPiece.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "photoUrl",
] as const;
const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

function setPieceIncludes() {
  return [
    {
      model: Match,
      as: "match",
      attributes: ["id", "matchDate", "homeTeamName", "awayTeamName"],
    },
    {
      model: Player,
      as: "taker",
      attributes: [...PLAYER_ATTRS],
      required: false,
    },
    {
      model: Player,
      as: "scorer",
      attributes: [...PLAYER_ATTRS],
      required: false,
    },
    {
      model: User,
      as: "creator",
      attributes: [...USER_ATTRS],
      required: false,
    },
  ];
}

// ── List ──

export async function listSetPieces(query: SetPieceQuery) {
  const where: Record<string, unknown> = {};
  if (query.matchId) where.matchId = query.matchId;
  if (query.type) where.type = query.type;
  if (query.side) where.side = query.side;
  if (query.takerId) where.takerId = query.takerId;

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await SetPiece.findAndCountAll({
    where,
    order: [
      ["minute", "ASC NULLS LAST"],
      ["createdAt", "ASC"],
    ],
    limit: query.limit,
    offset,
    include: setPieceIncludes(),
    distinct: true,
  });

  return {
    data: rows,
    meta: {
      total: count,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(count / query.limit),
    },
  };
}

// ── Get by ID ──

export async function getSetPieceById(id: string) {
  const record = await SetPiece.findByPk(id, { include: setPieceIncludes() });
  if (!record) throw new AppError("Set piece event not found", 404);
  return record;
}

// ── Create ──

export async function createSetPiece(
  body: CreateSetPieceInput,
  userId: string,
) {
  const record = await SetPiece.create({ ...body, createdBy: userId });
  return getSetPieceById(record.id);
}

// ── Update ──

export async function updateSetPiece(id: string, body: UpdateSetPieceInput) {
  const record = await SetPiece.findByPk(id);
  if (!record) throw new AppError("Set piece event not found", 404);
  await record.update(body);
  return getSetPieceById(id);
}

// ── Delete ──

export async function deleteSetPiece(id: string) {
  const record = await SetPiece.findByPk(id);
  if (!record) throw new AppError("Set piece event not found", 404);
  await record.destroy();
  return { id };
}

// ── Match Summary ──

export async function getMatchSetPieceSummary(matchId: string) {
  const events = await SetPiece.findAll({
    where: { matchId },
    order: [["minute", "ASC NULLS LAST"]],
    include: [
      {
        model: Player,
        as: "taker",
        attributes: ["id", "firstName", "lastName"],
        required: false,
      },
    ],
  });

  const summary = {
    total: events.length,
    attacking: events.filter((e) => e.side === "attacking").length,
    defending: events.filter((e) => e.side === "defending").length,
    byType: {} as Record<string, number>,
    byOutcome: {} as Record<string, number>,
    goals: events.filter((e) => e.outcome === "goal").length,
    events,
  };

  for (const e of events) {
    summary.byType[e.type] = (summary.byType[e.type] ?? 0) + 1;
    if (e.outcome) {
      summary.byOutcome[e.outcome] = (summary.byOutcome[e.outcome] ?? 0) + 1;
    }
  }

  return summary;
}
