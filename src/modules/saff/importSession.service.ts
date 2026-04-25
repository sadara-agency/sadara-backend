import * as crypto from "crypto";
import { Op } from "sequelize";
import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";
import {
  SaffImportSession,
  type WizardStep,
  type SessionDecisions,
  type AppliedSummary,
  type PreviewPayload,
} from "@modules/saff/importSession.model";
import {
  SaffTournament,
  SaffStanding,
  SaffFixture,
  SaffTeamMap,
} from "@modules/saff/saff.model";
import {
  runImportPlan,
  writeStagingFromPayload,
} from "@modules/saff/saff.service";
import type {
  CreateSessionInput,
  UpdateDecisionsInput,
  UploadPayload,
  ApplySessionInput,
} from "@modules/saff/saff.validation";

const STEP_ORDER: WizardStep[] = [
  "select",
  "fetch",
  "map",
  "review",
  "apply",
  "done",
];

function stepIndex(step: WizardStep): number {
  const i = STEP_ORDER.indexOf(step);
  return i < 0 ? -1 : i;
}

function digestPreview(preview: PreviewPayload): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(preview))
    .digest("hex");
}

// ══════════════════════════════════════════
// CRUD
// ══════════════════════════════════════════

export async function createSession(
  input: CreateSessionInput,
  userId: string,
): Promise<SaffImportSession> {
  const tournament = await SaffTournament.findOne({
    where: { saffId: input.saffTournamentId },
  });
  if (!tournament) throw new AppError("SAFF tournament not found", 404);

  // Lock check — at most one active session per (tournament, season)
  const active = await SaffImportSession.findOne({
    where: {
      tournamentId: tournament.id,
      season: input.season,
      step: { [Op.notIn]: ["done", "aborted"] },
    },
  });
  if (active) {
    throw new AppError(
      "An import is already in progress for this tournament and season",
      409,
    );
  }

  const session = await SaffImportSession.create({
    tournamentId: tournament.id,
    saffId: tournament.saffId,
    season: input.season,
    step: "fetch",
    snapshot: {},
    decisions: {},
    createdBy: userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return session;
}

export async function getSession(
  id: string,
  userId: string,
): Promise<SaffImportSession> {
  const session = await SaffImportSession.findByPk(id);
  if (!session) throw new AppError("Import session not found", 404);
  if (session.createdBy !== userId) {
    throw new AppError("Forbidden — you do not own this session", 403);
  }
  return session;
}

export async function listActiveSessionsForUser(
  userId: string,
): Promise<SaffImportSession[]> {
  return SaffImportSession.findAll({
    where: {
      createdBy: userId,
      step: { [Op.notIn]: ["done", "aborted"] },
    },
    order: [["updatedAt", "DESC"]],
  });
}

// ══════════════════════════════════════════
// STEP 2 — UPLOAD JSON
// ══════════════════════════════════════════

export async function uploadStaging(
  sessionId: string,
  userId: string,
  payload: UploadPayload,
  filename: string,
): Promise<SaffImportSession> {
  const session = await getSession(sessionId, userId);
  if (session.step !== "fetch") {
    throw new AppError(
      `Cannot upload at step '${session.step}' — must be in 'fetch' step`,
      409,
    );
  }
  if (payload.tournamentId !== session.saffId) {
    throw new AppError(
      `Upload tournamentId (${payload.tournamentId}) does not match session (${session.saffId})`,
      422,
    );
  }
  if (payload.season !== session.season) {
    throw new AppError(
      `Upload season (${payload.season}) does not match session (${session.season})`,
      422,
    );
  }

  const counts = await writeStagingFromPayload(payload);

  await session.update({
    step: "map",
    uploadFilename: filename,
    snapshot: {
      ...(session.snapshot ?? {}),
      source: "upload",
      validCounts: {
        standings: counts.standings,
        fixtures: counts.fixtures,
        teams: counts.teams,
      },
      fetchedAt: new Date().toISOString(),
    },
  });

  return session;
}

// ══════════════════════════════════════════
// STEP 2 — SCRAPE (called when scrape job completes)
// ══════════════════════════════════════════

export async function recordScrapeResult(
  sessionId: string,
  userId: string,
  fetchJobId: string,
  result: {
    standings: number;
    fixtures: number;
    teams: number;
    invalidStandings?: number;
    invalidFixtures?: number;
    invalidTeams?: number;
    scraperVersion: number;
    validationWarnings: Array<{
      entity: "standing" | "fixture" | "team";
      reason: string;
      raw: unknown;
    }>;
  },
): Promise<SaffImportSession> {
  const session = await getSession(sessionId, userId);
  if (session.step !== "fetch") {
    throw new AppError(`Cannot record scrape at step '${session.step}'`, 409);
  }

  const hasRows =
    result.standings > 0 || result.fixtures > 0 || result.teams > 0;

  await session.update({
    step: hasRows ? "map" : "fetch",
    fetchJobId,
    snapshot: {
      ...(session.snapshot ?? {}),
      source: "scrape",
      scraperVersion: result.scraperVersion,
      validCounts: {
        standings: result.standings,
        fixtures: result.fixtures,
        teams: result.teams,
      },
      invalidCounts: {
        standings: result.invalidStandings ?? 0,
        fixtures: result.invalidFixtures ?? 0,
        teams: result.invalidTeams ?? 0,
      },
      validationWarnings: result.validationWarnings,
      fetchedAt: new Date().toISOString(),
    },
  });

  return session;
}

// ══════════════════════════════════════════
// STEP 3 — UPDATE DECISIONS
// ══════════════════════════════════════════

export async function updateDecisions(
  sessionId: string,
  userId: string,
  patch: UpdateDecisionsInput,
): Promise<SaffImportSession> {
  const session = await getSession(sessionId, userId);
  if (session.step !== "map" && session.step !== "review") {
    throw new AppError(
      `Cannot update decisions at step '${session.step}'`,
      409,
    );
  }

  const merged: SessionDecisions = {
    ...(session.decisions ?? {}),
    ...(patch.teamResolutions !== undefined
      ? { teamResolutions: patch.teamResolutions }
      : {}),
    ...(patch.conflictResolutions !== undefined
      ? { conflictResolutions: patch.conflictResolutions }
      : {}),
  };

  // Updating decisions invalidates any cached preview
  await session.update({
    decisions: merged,
    preview: null,
    previewDigest: null,
  });

  return session;
}

// ══════════════════════════════════════════
// STEP 4 — PREVIEW (mandatory dry-run)
// ══════════════════════════════════════════

export async function previewSession(
  sessionId: string,
  userId: string,
): Promise<{
  session: SaffImportSession;
  preview: PreviewPayload;
  digest: string;
}> {
  const session = await getSession(sessionId, userId);
  if (session.step === "done" || session.step === "aborted") {
    throw new AppError(`Cannot preview a ${session.step} session`, 409);
  }

  // Verify staging has rows for this tournament+season
  const standingCount = await SaffStanding.count({
    where: { tournamentId: session.tournamentId, season: session.season },
  });
  const fixtureCount = await SaffFixture.count({
    where: { tournamentId: session.tournamentId, season: session.season },
  });
  if (standingCount === 0 && fixtureCount === 0) {
    throw new AppError(
      "Staging is empty — fetch or upload data before generating a preview",
      422,
    );
  }

  const { preview } = await runImportPlan({
    tournamentId: session.tournamentId,
    season: session.season,
    decisions: session.decisions ?? {},
    commit: false,
  });

  const digest = digestPreview(preview);
  await session.update({
    preview,
    previewDigest: digest,
    step: "review",
  });

  return { session, preview, digest };
}

// ══════════════════════════════════════════
// STEP 5 — APPLY
// ══════════════════════════════════════════

export async function applySession(
  sessionId: string,
  userId: string,
  input: ApplySessionInput,
): Promise<{
  session: SaffImportSession;
  applied: AppliedSummary;
}> {
  const session = await getSession(sessionId, userId);

  if (session.step === "done") {
    throw new AppError("This session has already been applied", 409);
  }
  if (session.step === "aborted") {
    throw new AppError("This session was aborted", 409);
  }
  if (session.step !== "review") {
    throw new AppError(
      `Cannot apply at step '${session.step}' — preview must be generated first`,
      409,
    );
  }

  if (!session.preview || !session.previewDigest) {
    throw new AppError("No preview cached — re-run the preview step", 409);
  }
  if (session.previewDigest !== input.confirmDigest) {
    throw new AppError(
      "PREVIEW_STALE: staging changed since preview was generated. Re-preview before applying.",
      409,
    );
  }

  // Persist decisions one last time before commit
  const finalDecisions: SessionDecisions = {
    ...(session.decisions ?? {}),
    ...(input.decisions.teamResolutions !== undefined
      ? { teamResolutions: input.decisions.teamResolutions }
      : {}),
    ...(input.decisions.conflictResolutions !== undefined
      ? { conflictResolutions: input.decisions.conflictResolutions }
      : {}),
  };

  const { applied } = await runImportPlan({
    tournamentId: session.tournamentId,
    season: session.season,
    decisions: finalDecisions,
    commit: true,
  });

  await session.update({
    step: "done",
    decisions: finalDecisions,
    appliedAt: new Date(),
    appliedSummary: applied,
  });

  logger.info(
    `[SAFF Wizard] Applied session ${session.id} — ${applied?.clubsCreated} clubs, ${applied?.matchesCreated} matches, ${applied?.playersLinked} players linked`,
  );

  return { session, applied: applied! };
}

// ══════════════════════════════════════════
// ABORT + REAP
// ══════════════════════════════════════════

export async function abortSession(
  sessionId: string,
  userId: string,
): Promise<SaffImportSession> {
  const session = await getSession(sessionId, userId);
  if (session.step === "done" || session.step === "aborted") {
    return session;
  }
  await session.update({ step: "aborted" });
  return session;
}

/**
 * Cron-driven cleanup. Deletes sessions whose `expiresAt` has passed
 * and that never reached `done` or `aborted`.
 */
export async function reapExpiredSessions(): Promise<number> {
  const result = await SaffImportSession.destroy({
    where: {
      expiresAt: { [Op.lt]: new Date() },
      step: { [Op.notIn]: ["done", "aborted"] },
    },
  });
  if (result > 0) {
    logger.info(`[SAFF Wizard] Reaped ${result} expired import sessions`);
  }
  return result;
}

// Internal export for tests
export const _internal = { stepIndex, digestPreview };
