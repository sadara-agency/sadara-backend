import { Op, WhereOptions, Transaction } from "sequelize";
import {
  Competition,
  ClubCompetition,
  CompetitionFormat,
  CompetitionGender,
} from "@modules/competitions/competition.model";
import { Club } from "@modules/clubs/club.model";
import { AppError } from "@middleware/errorHandler";
import { findOrThrow, destroyById } from "@shared/utils/serviceHelpers";
import type {
  CreateCompetitionInput,
  UpdateCompetitionInput,
  CompetitionQuery,
  AddClubInput,
} from "@modules/competitions/competition.validation";

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
  const competition = await findOrThrow(
    Competition,
    competitionId,
    "Competition",
  );
  await findOrThrow(Club, input.clubId, "Club");

  // Prevent a club from being in two leagues of the same format/gender/ageGroup
  if (competition.type === "league") {
    const existing = await findExistingLeagueEnrollment(
      input.clubId,
      input.season,
      competition.format,
      competition.gender,
      competition.ageGroup,
      competitionId,
    );

    if (existing) {
      const existingComp = (existing as any).competition as Competition;
      throw new AppError(
        `Club is already enrolled in league "${existingComp.name}" for season ${input.season}. ` +
          `Remove it first before adding to a different league.`,
        409,
      );
    }
  }

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

  // Keep clubs.league in sync
  syncClubLeagueField(input.clubId, input.season).catch(() => {});

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

  // Keep clubs.league in sync
  if (season) {
    syncClubLeagueField(clubId, season).catch(() => {});
  }

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

// ── League-uniqueness helpers ──

/**
 * Check if a club is already enrolled in a league-type competition
 * of the same format/gender/ageGroup for a given season.
 */
export async function findExistingLeagueEnrollment(
  clubId: string,
  season: string,
  format: CompetitionFormat,
  gender: CompetitionGender,
  ageGroup: string | null,
  excludeCompetitionId?: string,
  transaction?: Transaction,
): Promise<ClubCompetition | null> {
  const competitionWhere: WhereOptions = {
    type: "league",
    format,
    gender,
  };
  if (ageGroup) {
    competitionWhere.ageGroup = ageGroup;
  } else {
    competitionWhere[Op.or as any] = [{ ageGroup: null }, { ageGroup: "" }];
  }

  const ccWhere: WhereOptions = { clubId, season };
  if (excludeCompetitionId) {
    ccWhere.competitionId = { [Op.ne]: excludeCompetitionId };
  }

  return ClubCompetition.findOne({
    where: ccWhere,
    include: [
      {
        model: Competition,
        as: "competition",
        where: competitionWhere,
      },
    ],
    transaction,
  });
}

/**
 * Sync the clubs.league field to match the club's actual
 * men's outdoor senior league enrollment for a given season.
 */
export async function syncClubLeagueField(
  clubId: string,
  season: string,
  transaction?: Transaction,
): Promise<void> {
  const leagueEntry = await ClubCompetition.findOne({
    where: { clubId, season },
    include: [
      {
        model: Competition,
        as: "competition",
        where: {
          type: "league",
          format: "outdoor",
          gender: "men",
          [Op.or as any]: [{ ageGroup: null }, { ageGroup: "" }],
        },
      },
    ],
    transaction,
  });

  const leagueName = leagueEntry
    ? ((leagueEntry as any).competition as Competition).name
    : null;

  await Club.update(
    { league: leagueName },
    { where: { id: clubId }, transaction },
  );
}
