import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type WizardStep =
  | "select"
  | "fetch"
  | "map"
  | "review"
  | "apply"
  | "done"
  | "aborted";

export type TeamResolution =
  | { saffTeamId: number; action: "map"; clubId: string }
  | {
      saffTeamId: number;
      action: "create";
      newClubData: {
        name: string;
        nameAr: string;
        city?: string;
        league?: string;
      };
    }
  | { saffTeamId: number; action: "skip" };

export interface ConflictResolution {
  saffTeamId: number;
  resolution: "use_existing" | "create_new";
  targetClubId?: string;
}

export interface SessionDecisions {
  teamResolutions?: TeamResolution[];
  conflictResolutions?: ConflictResolution[];
}

export interface SessionSnapshot {
  scraperVersion?: number;
  source?: "scrape" | "upload";
  validCounts?: {
    standings: number;
    fixtures: number;
    teams: number;
  };
  invalidCounts?: {
    standings: number;
    fixtures: number;
    teams: number;
  };
  validationWarnings?: Array<{
    entity: "standing" | "fixture" | "team";
    reason: string;
    raw: unknown;
  }>;
  fetchedAt?: string;
}

export interface PreviewPayload {
  willCreate: {
    clubs: Array<{ saffTeamId: number; name: string; nameAr: string }>;
    matches: Array<{
      saffHomeTeamId: number;
      saffAwayTeamId: number;
      matchDate: string;
    }>;
    competitions: Array<{ saffId: number; name: string }>;
    clubCompetitions: number;
  };
  willUpdate: {
    clubs: Array<{ id: string; name: string; fields: string[] }>;
    matches: Array<{ id: string; fields: string[] }>;
  };
  conflicts: Array<{
    type: "duplicate-club";
    saffTeamId: number;
    candidates: Array<{ clubId: string; name: string; score: number }>;
  }>;
  blockers: Array<{
    type: "unmapped-team";
    saffTeamId: number;
    teamNameEn: string;
    teamNameAr: string;
  }>;
  unchanged: { clubs: number; matches: number };
  playerLinks: {
    totalPlayers: number;
    byClub: Array<{
      clubId: string;
      name: string;
      playerCount: number;
      players: Array<{ id: string; name: string; nameAr: string | null }>;
    }>;
  };
}

export interface AppliedSummary {
  clubsCreated: number;
  clubsUpdated: number;
  matchesCreated: number;
  matchesUpdated: number;
  competitionsCreated: number;
  playersLinked: number;
  skippedTeams: number;
}

interface SaffImportSessionAttributes {
  id: string;
  tournamentId: string;
  saffId: number;
  season: string;
  step: WizardStep;
  fetchJobId: string | null;
  uploadFilename: string | null;
  snapshot: SessionSnapshot;
  decisions: SessionDecisions;
  preview: PreviewPayload | null;
  previewDigest: string | null;
  appliedAt: Date | null;
  appliedSummary: AppliedSummary | null;
  createdBy: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffImportSessionCreation extends Optional<
  SaffImportSessionAttributes,
  | "id"
  | "step"
  | "fetchJobId"
  | "uploadFilename"
  | "snapshot"
  | "decisions"
  | "preview"
  | "previewDigest"
  | "appliedAt"
  | "appliedSummary"
  | "expiresAt"
  | "createdAt"
  | "updatedAt"
> {}

export class SaffImportSession
  extends Model<SaffImportSessionAttributes, SaffImportSessionCreation>
  implements SaffImportSessionAttributes
{
  declare id: string;
  declare tournamentId: string;
  declare saffId: number;
  declare season: string;
  declare step: WizardStep;
  declare fetchJobId: string | null;
  declare uploadFilename: string | null;
  declare snapshot: SessionSnapshot;
  declare decisions: SessionDecisions;
  declare preview: PreviewPayload | null;
  declare previewDigest: string | null;
  declare appliedAt: Date | null;
  declare appliedSummary: AppliedSummary | null;
  declare createdBy: string;
  declare expiresAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SaffImportSession.init(
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
    saffId: { type: DataTypes.INTEGER, allowNull: false, field: "saff_id" },
    season: { type: DataTypes.STRING(20), allowNull: false },
    step: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "select",
    },
    fetchJobId: { type: DataTypes.STRING(128), field: "fetch_job_id" },
    uploadFilename: { type: DataTypes.STRING(255), field: "upload_filename" },
    snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    decisions: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    preview: { type: DataTypes.JSONB },
    previewDigest: { type: DataTypes.STRING(64), field: "preview_digest" },
    appliedAt: { type: DataTypes.DATE, field: "applied_at" },
    appliedSummary: { type: DataTypes.JSONB, field: "applied_summary" },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
      references: { model: "users", key: "id" },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
  },
  {
    sequelize,
    tableName: "saff_import_sessions",
    underscored: true,
    timestamps: true,
  },
);
