import { Op, WhereOptions } from "sequelize";
import { Competition, ClubCompetition } from "./competition.model";
import { Club } from "../clubs/club.model";
import { AppError } from "../../middleware/errorHandler";
import { findOrThrow, destroyById } from "../../shared/utils/serviceHelpers";
import type {
  CreateCompetitionInput,
  UpdateCompetitionInput,
  CompetitionQuery,
  AddClubInput,
} from "./competition.schema";

// ── List ──

export async function listCompetitions(query: CompetitionQuery) {
  const {
    page,
    limit,
    sort,
    order,
    search,
    type,
    tier,
    ageGroup,
    gender,
    format,
    agencyValue,
    isActive,
  } = query;

  const where: WhereOptions = {};

  if (search) {
    (where as any)[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { nameAr: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (type) where.type = type;
  if (tier) where.tier = tier;
  if (ageGroup) where.ageGroup = ageGroup;
  if (gender) where.gender = gender;
  if (format) where.format = format;
  if (agencyValue) where.agencyValue = agencyValue;
  if (isActive !== undefined) where.isActive = isActive;

  const { rows, count } = await Competition.findAndCountAll({
    where,
    order: [[sort, order]],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    data: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}

// ── Get by ID ──

export async function getCompetitionById(id: string) {
  return findOrThrow(Competition, id, "Competition");
}

// ── Create ──

export async function createCompetition(input: CreateCompetitionInput) {
  return Competition.create(input as any);
}

// ── Update ──

export async function updateCompetition(
  id: string,
  input: UpdateCompetitionInput,
) {
  const competition = await findOrThrow(Competition, id, "Competition");
  await competition.update(input as any);
  return competition;
}

// ── Delete ──

export async function deleteCompetition(id: string) {
  return destroyById(Competition, id, "Competition");
}

// ── Clubs in Competition ──

export async function getCompetitionClubs(id: string, season?: string) {
  await findOrThrow(Competition, id, "Competition");

  const where: WhereOptions = { competitionId: id };
  if (season) where.season = season;

  const entries = await ClubCompetition.findAll({
    where,
    include: [{ model: Club, as: "club" }],
    order: [["season", "DESC"]],
  });

  return entries;
}

export async function addClubToCompetition(
  competitionId: string,
  input: AddClubInput,
) {
  await findOrThrow(Competition, competitionId, "Competition");
  await findOrThrow(Club, input.clubId, "Club");

  const [entry, created] = await ClubCompetition.findOrCreate({
    where: {
      clubId: input.clubId,
      competitionId,
      season: input.season,
    },
    defaults: {
      clubId: input.clubId,
      competitionId,
      season: input.season,
    },
  });

  if (!created)
    throw new AppError("Club already in this competition/season", 409);
  return entry;
}

export async function removeClubFromCompetition(
  competitionId: string,
  clubId: string,
  season?: string,
) {
  const where: WhereOptions = { competitionId, clubId };
  if (season) where.season = season;

  const deleted = await ClubCompetition.destroy({ where });
  if (!deleted) throw new AppError("Club-competition entry not found", 404);
  return { competitionId, clubId };
}

// ── Get competitions for a club ──

export async function getClubCompetitions(clubId: string, season?: string) {
  const where: WhereOptions = { clubId };
  if (season) where.season = season;

  const entries = await ClubCompetition.findAll({
    where,
    include: [{ model: Competition, as: "competition" }],
    order: [["season", "DESC"]],
  });

  return entries;
}
