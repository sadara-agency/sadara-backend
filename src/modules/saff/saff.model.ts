import { DataTypes, Model, Op, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ══════════════════════════════════════════
// SAFF TOURNAMENT
// ══════════════════════════════════════════

// Squad context — added in Phase 1 of the Club/Squad refactor.
// Drives the wizard's apply step: each tournament resolves to a specific
// (ageCategory, division) combination so a U-17 import lands in U-17 squads
// instead of senior. is_supported=false explicitly excludes women's, futsal,
// and beach soccer tournaments from import.
export type SaffAgeCategory =
  | "senior"
  | "u23"
  | "u21"
  | "u20"
  | "u19"
  | "u18"
  | "u17"
  | "u16"
  | "u15"
  | "u14"
  | "u13"
  | "u12"
  | "u11";

export type SaffDivision =
  | "premier"
  | "1st-division"
  | "2nd-division"
  | "3rd-division"
  | "4th-division"
  | null;

export type SaffCompetitionType = "league" | "cup" | "super-cup" | "tournament";

interface SaffTournamentAttributes {
  id: string;
  saffId: number; // championship.php?id=XXX
  name: string;
  nameAr: string;
  category: string; // pro | youth | youth-d1 | youth-d2 | grassroots | women | futsal | beach | esports
  tier: number; // 1-5
  agencyValue: string; // Critical | High | Medium | Low | Scouting | Niche
  description?: string | null;
  icon?: string | null;
  isActive: boolean;
  lastSyncedAt?: Date | null;
  // Squad context (Phase 1)
  ageCategory: SaffAgeCategory;
  division: SaffDivision;
  competitionType: SaffCompetitionType;
  logoUrl?: string | null; // Scraped from championship.php?id=X header
  isSupported: boolean; // false → women's / futsal / beach (wizard rejects)
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffTournamentCreation extends Optional<
  SaffTournamentAttributes,
  | "id"
  | "isActive"
  | "ageCategory"
  | "division"
  | "competitionType"
  | "logoUrl"
  | "isSupported"
  | "createdAt"
  | "updatedAt"
> {}

export class SaffTournament
  extends Model<SaffTournamentAttributes, SaffTournamentCreation>
  implements SaffTournamentAttributes
{
  declare id: string;
  declare saffId: number;
  declare name: string;
  declare nameAr: string;
  declare category: string;
  declare tier: number;
  declare agencyValue: string;
  declare description: string | null;
  declare icon: string | null;
  declare isActive: boolean;
  declare lastSyncedAt: Date | null;
  declare ageCategory: SaffAgeCategory;
  declare division: SaffDivision;
  declare competitionType: SaffCompetitionType;
  declare logoUrl: string | null;
  declare isSupported: boolean;
}

SaffTournament.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: "saff_id",
    },
    name: { type: DataTypes.STRING, allowNull: false },
    nameAr: { type: DataTypes.STRING, allowNull: false, field: "name_ar" },
    category: { type: DataTypes.STRING, allowNull: false },
    tier: { type: DataTypes.INTEGER, allowNull: false },
    agencyValue: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "agency_value",
    },
    description: { type: DataTypes.TEXT },
    icon: { type: DataTypes.STRING },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    lastSyncedAt: { type: DataTypes.DATE, field: "last_synced_at" },
    ageCategory: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "senior",
      field: "age_category",
    },
    division: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    competitionType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "league",
      field: "competition_type",
    },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "logo_url",
    },
    isSupported: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_supported",
    },
  },
  {
    sequelize,
    tableName: "saff_tournaments",
    underscored: true,
    timestamps: true,
  },
);

// ══════════════════════════════════════════
// SAFF STANDING
// ══════════════════════════════════════════

interface SaffStandingAttributes {
  id: string;
  tournamentId: string;
  season: string;
  position: number;
  saffTeamId: number;
  teamNameEn: string;
  teamNameAr: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  clubId?: string | null; // Mapped Sadara Club UUID
  lastSeenAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffStandingCreation extends Optional<
  SaffStandingAttributes,
  "id" | "clubId" | "lastSeenAt" | "createdAt" | "updatedAt"
> {}

export class SaffStanding
  extends Model<SaffStandingAttributes, SaffStandingCreation>
  implements SaffStandingAttributes
{
  declare id: string;
  declare tournamentId: string;
  declare season: string;
  declare position: number;
  declare saffTeamId: number;
  declare teamNameEn: string;
  declare teamNameAr: string;
  declare played: number;
  declare won: number;
  declare drawn: number;
  declare lost: number;
  declare goalsFor: number;
  declare goalsAgainst: number;
  declare goalDifference: number;
  declare points: number;
  declare clubId: string | null;
  declare lastSeenAt: Date | null;
}

SaffStanding.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tournamentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "tournament_id",
      references: { model: "saff_tournaments", key: "id" },
    },
    season: { type: DataTypes.STRING(20), allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false },
    saffTeamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "saff_team_id",
    },
    teamNameEn: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "team_name_en",
    },
    teamNameAr: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "team_name_ar",
    },
    played: { type: DataTypes.INTEGER, defaultValue: 0 },
    won: { type: DataTypes.INTEGER, defaultValue: 0 },
    drawn: { type: DataTypes.INTEGER, defaultValue: 0 },
    lost: { type: DataTypes.INTEGER, defaultValue: 0 },
    goalsFor: { type: DataTypes.INTEGER, defaultValue: 0, field: "goals_for" },
    goalsAgainst: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "goals_against",
    },
    goalDifference: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "goal_difference",
    },
    points: { type: DataTypes.INTEGER, defaultValue: 0 },
    clubId: {
      type: DataTypes.UUID,
      field: "club_id",
      references: { model: "clubs", key: "id" },
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "last_seen_at",
    },
  },
  {
    sequelize,
    tableName: "saff_standings",
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ["tournament_id", "season", "saff_team_id"],
        unique: true,
        name: "idx_saff_standings_team_season",
      },
      { fields: ["saff_team_id"] },
      { fields: ["club_id"] },
    ],
  },
);

// ══════════════════════════════════════════
// SAFF FIXTURE
// ══════════════════════════════════════════

interface SaffFixtureAttributes {
  id: string;
  tournamentId: string;
  season: string;
  week?: number | null;
  matchDate: string;
  matchTime?: string | null;
  saffHomeTeamId: number;
  homeTeamNameEn: string;
  homeTeamNameAr: string;
  saffAwayTeamId: number;
  awayTeamNameEn: string;
  awayTeamNameAr: string;
  homeScore?: number | null;
  awayScore?: number | null;
  stadium?: string | null;
  city?: string | null;
  status: "upcoming" | "completed" | "cancelled";
  homeClubId?: string | null; // Mapped Sadara Club UUID
  awayClubId?: string | null;
  matchId?: string | null; // Mapped Sadara Match UUID
  lastSeenAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffFixtureCreation extends Optional<
  SaffFixtureAttributes,
  | "id"
  | "status"
  | "homeClubId"
  | "awayClubId"
  | "matchId"
  | "lastSeenAt"
  | "createdAt"
  | "updatedAt"
> {}

export class SaffFixture
  extends Model<SaffFixtureAttributes, SaffFixtureCreation>
  implements SaffFixtureAttributes
{
  declare id: string;
  declare tournamentId: string;
  declare season: string;
  declare week: number | null;
  declare matchDate: string;
  declare matchTime: string | null;
  declare saffHomeTeamId: number;
  declare homeTeamNameEn: string;
  declare homeTeamNameAr: string;
  declare saffAwayTeamId: number;
  declare awayTeamNameEn: string;
  declare awayTeamNameAr: string;
  declare homeScore: number | null;
  declare awayScore: number | null;
  declare stadium: string | null;
  declare city: string | null;
  declare status: "upcoming" | "completed" | "cancelled";
  declare homeClubId: string | null;
  declare awayClubId: string | null;
  declare matchId: string | null;
  declare lastSeenAt: Date | null;
}

SaffFixture.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tournamentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "tournament_id",
      references: { model: "saff_tournaments", key: "id" },
    },
    season: { type: DataTypes.STRING(20), allowNull: false },
    week: { type: DataTypes.INTEGER },
    matchDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "match_date",
    },
    matchTime: { type: DataTypes.STRING(10), field: "match_time" },
    saffHomeTeamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "saff_home_team_id",
    },
    homeTeamNameEn: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "home_team_name_en",
    },
    homeTeamNameAr: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "home_team_name_ar",
    },
    saffAwayTeamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "saff_away_team_id",
    },
    awayTeamNameEn: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "away_team_name_en",
    },
    awayTeamNameAr: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "away_team_name_ar",
    },
    homeScore: { type: DataTypes.INTEGER },
    awayScore: { type: DataTypes.INTEGER },
    stadium: { type: DataTypes.STRING },
    city: { type: DataTypes.STRING },
    status: {
      type: DataTypes.ENUM("upcoming", "completed", "cancelled"),
      defaultValue: "upcoming",
    },
    homeClubId: {
      type: DataTypes.UUID,
      field: "home_club_id",
      references: { model: "clubs", key: "id" },
    },
    awayClubId: {
      type: DataTypes.UUID,
      field: "away_club_id",
      references: { model: "clubs", key: "id" },
    },
    matchId: {
      type: DataTypes.UUID,
      field: "match_id",
      references: { model: "matches", key: "id" },
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "last_seen_at",
    },
  },
  {
    sequelize,
    tableName: "saff_fixtures",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["tournament_id", "season", "match_date"] },
      {
        fields: [
          "tournament_id",
          "season",
          "saff_home_team_id",
          "saff_away_team_id",
          "match_date",
        ],
        unique: true,
        name: "idx_saff_fixtures_match_identity",
      },
      { fields: ["saff_home_team_id"] },
      { fields: ["saff_away_team_id"] },
      {
        fields: ["match_id"],
        unique: true,
        where: { match_id: { [Op.ne]: null } },
        name: "idx_saff_fixtures_match_id_unique",
      },
      { fields: ["home_club_id"], name: "idx_saff_fixtures_home_club_id" },
      { fields: ["away_club_id"], name: "idx_saff_fixtures_away_club_id" },
      { fields: ["status"], name: "idx_saff_fixtures_status" },
    ],
  },
);

// ══════════════════════════════════════════
// SAFF TEAM MAPPING
// ══════════════════════════════════════════

interface SaffTeamMapAttributes {
  id: string;
  saffTeamId: number;
  season: string;
  teamNameEn: string;
  teamNameAr: string;
  city?: string | null;
  logoUrl?: string | null;
  clubId?: string | null; // Mapped Sadara Club UUID
  // Phase 3 — squad-aware mapping
  tournamentId?: string | null; // NULL = legacy general mapping
  squadId?: string | null; // Resolved squad for this tournament context
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffTeamMapCreation extends Optional<
  SaffTeamMapAttributes,
  "id" | "clubId" | "tournamentId" | "squadId" | "createdAt" | "updatedAt"
> {}

export class SaffTeamMap
  extends Model<SaffTeamMapAttributes, SaffTeamMapCreation>
  implements SaffTeamMapAttributes
{
  declare id: string;
  declare saffTeamId: number;
  declare season: string;
  declare teamNameEn: string;
  declare teamNameAr: string;
  declare city: string | null;
  declare logoUrl: string | null;
  declare clubId: string | null;
  declare tournamentId: string | null;
  declare squadId: string | null;
}

SaffTeamMap.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saffTeamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "saff_team_id",
    },
    season: { type: DataTypes.STRING(20), allowNull: false },
    teamNameEn: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "team_name_en",
    },
    teamNameAr: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "team_name_ar",
    },
    city: { type: DataTypes.STRING },
    logoUrl: { type: DataTypes.STRING(500), field: "logo_url" },
    clubId: {
      type: DataTypes.UUID,
      field: "club_id",
      references: { model: "clubs", key: "id" },
    },
    // Phase 3 columns — added by migration 151
    tournamentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "tournament_id",
      references: { model: "saff_tournaments", key: "id" },
    },
    squadId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "squad_id",
      references: { model: "squads", key: "id" },
    },
  },
  {
    sequelize,
    tableName: "saff_team_maps",
    underscored: true,
    timestamps: true,
    indexes: [
      // Uniqueness enforced via two partial DB indexes (see migration 151):
      //   (saff_team_id, season) WHERE tournament_id IS NULL
      //   (saff_team_id, season, tournament_id) WHERE tournament_id IS NOT NULL
      { fields: ["saff_team_id", "season"] },
      { fields: ["club_id"] },
      { fields: ["squad_id"] },
      { fields: ["tournament_id"] },
    ],
  },
);

// ══════════════════════════════════════════
// SAFF SCRAPE RUN (audit log)
// ══════════════════════════════════════════

type ScrapeRunStatus =
  | "pending"
  | "success"
  | "failed"
  | "skipped"
  | "sanity_fail";

interface SaffScrapeRunAttributes {
  id: string;
  source: string;
  saffId?: number | null;
  season?: string | null;
  targetUrl?: string | null;
  triggerSource?: string | null;
  startedAt: Date;
  finishedAt?: Date | null;
  durationMs?: number | null;
  status: ScrapeRunStatus;
  httpStatus?: number | null;
  rowsStandings?: number | null;
  rowsFixtures?: number | null;
  rowsTeams?: number | null;
  scraperVersion?: number | null;
  validationWarnings?: number | null;
  errorMessage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffScrapeRunCreation extends Optional<
  SaffScrapeRunAttributes,
  | "id"
  | "saffId"
  | "season"
  | "targetUrl"
  | "triggerSource"
  | "finishedAt"
  | "durationMs"
  | "httpStatus"
  | "rowsStandings"
  | "rowsFixtures"
  | "rowsTeams"
  | "scraperVersion"
  | "validationWarnings"
  | "errorMessage"
  | "createdAt"
  | "updatedAt"
> {}

export class SaffScrapeRun
  extends Model<SaffScrapeRunAttributes, SaffScrapeRunCreation>
  implements SaffScrapeRunAttributes
{
  declare id: string;
  declare source: string;
  declare saffId: number | null;
  declare season: string | null;
  declare targetUrl: string | null;
  declare triggerSource: string | null;
  declare startedAt: Date;
  declare finishedAt: Date | null;
  declare durationMs: number | null;
  declare status: ScrapeRunStatus;
  declare httpStatus: number | null;
  declare rowsStandings: number | null;
  declare rowsFixtures: number | null;
  declare rowsTeams: number | null;
  declare scraperVersion: number | null;
  declare validationWarnings: number | null;
  declare errorMessage: string | null;
}

SaffScrapeRun.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    source: { type: DataTypes.STRING(20), allowNull: false },
    saffId: { type: DataTypes.INTEGER, allowNull: true, field: "saff_id" },
    season: { type: DataTypes.STRING(20), allowNull: true },
    targetUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "target_url",
    },
    triggerSource: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "trigger_source",
    },
    startedAt: { type: DataTypes.DATE, allowNull: false, field: "started_at" },
    finishedAt: { type: DataTypes.DATE, allowNull: true, field: "finished_at" },
    durationMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "duration_ms",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    httpStatus: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "http_status",
    },
    rowsStandings: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "rows_standings",
    },
    rowsFixtures: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "rows_fixtures",
    },
    rowsTeams: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "rows_teams",
    },
    scraperVersion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "scraper_version",
    },
    validationWarnings: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: "validation_warnings",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
    },
  },
  {
    sequelize,
    tableName: "saff_scrape_runs",
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ["saff_id", "season"],
        name: "idx_saff_scrape_runs_tournament",
      },
      { fields: ["started_at"], name: "idx_saff_scrape_runs_started_at" },
      { fields: ["status"], name: "idx_saff_scrape_runs_status" },
    ],
  },
);
