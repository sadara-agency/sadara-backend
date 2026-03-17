import { Op, QueryTypes } from "sequelize";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sequelize } from "@config/database";
import { env } from "@config/env";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { isEncrypted, decrypt } from "@shared/utils/encryption";
import { logger } from "@config/logger";
import { Contract } from "@modules/contracts/contract.model";
import { Match } from "@modules/matches/match.model";
import { Document } from "@modules/documents/document.model";
import { Gate, GateChecklist } from "@modules/gates/gate.model";
import { Task } from "@modules/tasks/task.model";
import { Injury, InjuryUpdate } from "@modules/injuries/injury.model";
import { AppError } from "@middleware/errorHandler";
import { regenerateSignedPdf } from "@modules/contracts/contract.signing.service";
import { PlayerAccount } from "@modules/portal/playerAccount.model";

// ══════════════════════════════════════════
// RESOLVE: User → Player
// ══════════════════════════════════════════

/**
 * Get the player record linked to a user account.
 *
 * Supports TWO login paths:
 *   1. users table (invite-based registration) → users.player_id or email match
 *   2. player_accounts table (direct player login) → player_accounts.player_id
 */
export async function getLinkedPlayer(userId: string): Promise<Player> {
  // ── Path 1: Check the users table ──
  const user = await User.findByPk(userId, {
    attributes: ["id", "email", "role", "playerId"],
  });

  if (user) {
    if (user.role !== "Player") {
      throw new AppError("This endpoint is for player accounts only", 403);
    }

    if (user.playerId) {
      const player = await Player.findByPk(user.playerId);
      if (player) return player;
    }

    // Fallback: try to match by email (won't work for encrypted emails,
    // but handles legacy accounts where playerId wasn't set)
    const player = await Player.findOne({ where: { email: user.email } });
    if (!player) {
      throw new AppError(
        "No player profile linked to this account. Contact your agent.",
        404,
      );
    }

    await user.update({ playerId: player.id } as any);
    return player;
  }

  // ── Path 2: Check the player_accounts table ──
  const account = await PlayerAccount.findByPk(userId, {
    attributes: ["playerId", "status"],
  });

  if (!account) {
    throw new AppError("User not found", 404);
  }

  if (account.status !== "active") {
    throw new AppError("Account is not yet activated", 403);
  }

  const player = await Player.findByPk(account.playerId);
  if (!player) {
    throw new AppError(
      "No player profile linked to this account. Contact your agent.",
      404,
    );
  }

  return player;
}

/**
 * Safely extract the player's UUID string from a Sequelize instance.
 * Prevents "undefined" issues when passing to WHERE clauses or raw SQL.
 */
function getPlayerId(player: Player): string {
  const id = player.getDataValue("id") ?? (player as any).id;
  if (!id) throw new AppError("Player record has no ID", 500);
  return id;
}

// ══════════════════════════════════════════
// MY PROFILE
// ══════════════════════════════════════════

export async function getMyProfile(userId: string) {
  const player = await getLinkedPlayer(userId);
  const playerId = getPlayerId(player);

  const profile = await Player.findByPk(playerId, {
    include: [
      {
        model: Club,
        as: "club",
        attributes: [
          "id",
          "name",
          "nameAr",
          "logoUrl",
          "league",
          "city",
          "stadium",
        ],
      },
      {
        model: User,
        as: "agent",
        attributes: ["id", "fullName", "fullNameAr", "email"],
      },
    ],
  });

  // Get active contract
  const activeContract = await Contract.findOne({
    where: { playerId, status: "Active" },
    include: [
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr", "logoUrl"],
      },
    ],
    order: [["endDate", "DESC"]],
  });

  // Get quick stats via raw SQL (safe — playerId is a verified string)
  const [stats] = await sequelize.query<any>(
    `SELECT
      COALESCE((SELECT COUNT(*) FROM contracts WHERE player_id = :id AND status = 'Active'), 0) AS "activeContracts",
      COALESCE((SELECT COUNT(*) FROM documents WHERE entity_type = 'Player' AND entity_id = :id), 0) AS "totalDocuments",
      COALESCE((SELECT COUNT(*) FROM tasks WHERE player_id = :id AND status != 'Completed'), 0) AS "openTasks",
      COALESCE((SELECT MAX(gate_number::text::integer) FROM gates WHERE player_id = :id AND status = 'Completed'), -1) AS "currentGate"
    `,
    { replacements: { id: playerId }, type: QueryTypes.SELECT },
  );

  return {
    player: profile,
    contract: activeContract,
    stats: stats || {},
  };
}

// ══════════════════════════════════════════
// MY SCHEDULE (upcoming matches)
// ══════════════════════════════════════════

export async function getMySchedule(userId: string, query: any = {}) {
  const player = await getLinkedPlayer(userId);
  const playerId = getPlayerId(player);
  const clubId = player.currentClubId;

  if (!clubId) return { upcoming: [], past: [], tasks: [] };

  const now = new Date();

  const upcoming = await Match.findAll({
    where: {
      [Op.or]: [{ homeClubId: clubId }, { awayClubId: clubId }],
      matchDate: { [Op.gte]: now },
    },
    include: [
      {
        model: Club,
        as: "homeClub",
        attributes: ["id", "name", "nameAr", "logoUrl"],
      },
      {
        model: Club,
        as: "awayClub",
        attributes: ["id", "name", "nameAr", "logoUrl"],
      },
    ],
    order: [["matchDate", "ASC"]],
    limit: 10,
  });

  const past = await Match.findAll({
    where: {
      [Op.or]: [{ homeClubId: clubId }, { awayClubId: clubId }],
      matchDate: { [Op.lt]: now },
    },
    include: [
      {
        model: Club,
        as: "homeClub",
        attributes: ["id", "name", "nameAr", "logoUrl"],
      },
      {
        model: Club,
        as: "awayClub",
        attributes: ["id", "name", "nameAr", "logoUrl"],
      },
    ],
    order: [["matchDate", "DESC"]],
    limit: 10,
  });

  const tasks = await Task.findAll({
    where: { playerId, status: { [Op.ne]: "Completed" } },
    order: [["dueDate", "ASC"]],
    limit: 10,
  });

  return { upcoming, past, tasks };
}

// ══════════════════════════════════════════
// MY DOCUMENTS (read-only)
// ══════════════════════════════════════════

export async function getMyDocuments(userId: string) {
  const player = await getLinkedPlayer(userId);
  const playerId = getPlayerId(player);

  const documents = await Document.findAll({
    where: { entityType: "Player", entityId: playerId } as any,
    include: [{ model: User, as: "uploader", attributes: ["id", "fullName"] }],
    order: [["createdAt", "DESC"]],
  });

  const grouped = {
    contracts: documents.filter(
      (d: any) => d.type === "Contract" || d.type === "contract",
    ),
    identity: documents.filter((d: any) =>
      ["ID", "Passport", "id", "passport"].includes(d.type),
    ),
    medical: documents.filter((d: any) =>
      ["Medical", "medical", "Fitness"].includes(d.type),
    ),
    other: documents.filter(
      (d: any) =>
        ![
          "Contract",
          "contract",
          "ID",
          "Passport",
          "id",
          "passport",
          "Medical",
          "medical",
          "Fitness",
        ].includes(d.type),
    ),
  };

  return { documents, grouped, total: documents.length };
}

// ══════════════════════════════════════════
// MY DEVELOPMENT PLAN (IDP + Gates)
// ══════════════════════════════════════════

export async function getMyDevelopment(userId: string) {
  const player = await getLinkedPlayer(userId);
  const playerId = getPlayerId(player);

  const gates = await Gate.findAll({
    where: { playerId },
    include: [
      { model: GateChecklist, as: "checklist", order: [["sortOrder", "ASC"]] },
      {
        model: User,
        as: "approver",
        attributes: ["id", "fullName", "fullNameAr"],
      },
    ],
    order: [["gateNumber", "ASC"]],
  });

  const passedGates = gates.filter((g: any) => g.status === "Completed");
  const currentGateNumber =
    passedGates.length > 0
      ? Math.max(...passedGates.map((g: any) => g.gateNumber)) + 1
      : 0;

  const totalGates = 4;
  const gateProgress = Math.round((passedGates.length / totalGates) * 100);

  return {
    gates,
    currentGateNumber: Math.min(currentGateNumber, 3),
    gateProgress,
    passedCount: passedGates.length,
    totalGates,
  };
}

// ══════════════════════════════════════════
// MY STATS (performance statistics)
// ══════════════════════════════════════════

export async function getMyStats(userId: string) {
  const player = await getLinkedPlayer(userId);
  const playerId = getPlayerId(player);
  const isGoalkeeper = player.position === "GK";

  // ── Career aggregate totals ──
  const [totals] = await sequelize.query<any>(
    `SELECT
      COUNT(*)::INT                               AS "matchesPlayed",
      COALESCE(SUM(minutes_played), 0)::INT       AS "totalMinutes",
      ROUND(AVG(rating), 1)::FLOAT                AS "averageRating",
      COALESCE(SUM(goals), 0)::INT                AS "goals",
      COALESCE(SUM(assists), 0)::INT              AS "assists",
      COALESCE(SUM(key_passes), 0)::INT           AS "keyPasses",
      COALESCE(SUM(shots_total), 0)::INT          AS "shotsTotal",
      COALESCE(SUM(shots_on_target), 0)::INT      AS "shotsOnTarget",
      COALESCE(SUM(dribbles_completed), 0)::INT   AS "dribblesCompleted",
      COALESCE(SUM(dribbles_attempted), 0)::INT   AS "dribblesAttempted",
      COALESCE(SUM(tackles_total), 0)::INT        AS "tacklesTotal",
      COALESCE(SUM(interceptions), 0)::INT        AS "interceptions",
      COALESCE(SUM(duels_won), 0)::INT            AS "duelsWon",
      COALESCE(SUM(duels_total), 0)::INT          AS "duelsTotal",
      COALESCE(SUM(yellow_cards), 0)::INT         AS "yellowCards",
      COALESCE(SUM(red_cards), 0)::INT            AS "redCards",
      COALESCE(SUM(fouls_committed), 0)::INT      AS "foulsCommitted",
      COALESCE(SUM(fouls_drawn), 0)::INT          AS "foulsDrawn",
      COALESCE(SUM(passes_total), 0)::INT         AS "passesTotal",
      COALESCE(SUM(passes_completed), 0)::INT     AS "passesCompleted"
      ${
        isGoalkeeper
          ? `,
      COALESCE(SUM(saves), 0)::INT                AS "saves",
      COUNT(*) FILTER (WHERE clean_sheet = true)::INT AS "cleanSheets",
      COALESCE(SUM(goals_conceded), 0)::INT       AS "goalsConceded",
      COALESCE(SUM(penalties_saved), 0)::INT      AS "penaltiesSaved"
      `
          : ""
      }
    FROM player_match_stats
    WHERE player_id = :playerId`,
    { replacements: { playerId }, type: QueryTypes.SELECT },
  );

  const t = totals || {};

  // ── Recent form: last 10 matches ──
  const recentForm = await sequelize.query<any>(
    `SELECT
      pms.match_id        AS "matchId",
      m.match_date        AS "matchDate",
      m.competition,
      m.venue,
      m.home_score        AS "homeScore",
      m.away_score        AS "awayScore",
      hc.name             AS "homeClub",
      ac.name             AS "awayClub",
      hc.logo_url         AS "homeClubLogo",
      ac.logo_url         AS "awayClubLogo",
      CASE
        WHEN m.home_club_id = :clubId THEN ac.name
        ELSE hc.name
      END                 AS "opponent",
      CASE
        WHEN m.home_club_id = :clubId THEN ac.logo_url
        ELSE hc.logo_url
      END                 AS "opponentLogo",
      CASE
        WHEN m.home_club_id = :clubId THEN 'home'
        ELSE 'away'
      END                 AS "venue_side",
      pms.minutes_played  AS "minutesPlayed",
      pms.goals,
      pms.assists,
      pms.key_passes      AS "keyPasses",
      pms.shots_total     AS "shotsTotal",
      pms.shots_on_target AS "shotsOnTarget",
      pms.passes_total    AS "passesTotal",
      pms.passes_completed AS "passesCompleted",
      pms.tackles_total   AS "tacklesTotal",
      pms.interceptions,
      pms.duels_won       AS "duelsWon",
      pms.duels_total     AS "duelsTotal",
      pms.dribbles_completed AS "dribblesCompleted",
      pms.dribbles_attempted AS "dribblesAttempted",
      pms.fouls_committed AS "foulsCommitted",
      pms.fouls_drawn     AS "foulsDrawn",
      pms.yellow_cards    AS "yellowCards",
      pms.red_cards       AS "redCards",
      pms.rating,
      pms.position_in_match AS "positionInMatch"
      ${
        isGoalkeeper
          ? `,
      pms.saves,
      pms.clean_sheet     AS "cleanSheet",
      pms.goals_conceded  AS "goalsConceded",
      pms.penalties_saved  AS "penaltiesSaved"
      `
          : ""
      }
    FROM player_match_stats pms
    JOIN matches m ON m.id = pms.match_id
    LEFT JOIN clubs hc ON hc.id = m.home_club_id
    LEFT JOIN clubs ac ON ac.id = m.away_club_id
    WHERE pms.player_id = :playerId
    ORDER BY m.match_date DESC
    LIMIT 10`,
    {
      replacements: {
        playerId,
        clubId: player.currentClubId || "00000000-0000-0000-0000-000000000000",
      },
      type: QueryTypes.SELECT,
    },
  );

  return {
    position: player.position,
    isGoalkeeper,
    overview: {
      matchesPlayed: t.matchesPlayed || 0,
      totalMinutes: t.totalMinutes || 0,
      averageRating: t.averageRating || 0,
    },
    offensive: {
      goals: t.goals || 0,
      assists: t.assists || 0,
      keyPasses: t.keyPasses || 0,
      shotsTotal: t.shotsTotal || 0,
      shotsOnTarget: t.shotsOnTarget || 0,
      dribblesCompleted: t.dribblesCompleted || 0,
      dribblesAttempted: t.dribblesAttempted || 0,
    },
    defensive: {
      tacklesTotal: t.tacklesTotal || 0,
      interceptions: t.interceptions || 0,
      duelsWon: t.duelsWon || 0,
      duelsTotal: t.duelsTotal || 0,
    },
    passing: {
      passesTotal: t.passesTotal || 0,
      passesCompleted: t.passesCompleted || 0,
      keyPasses: t.keyPasses || 0,
    },
    discipline: {
      yellowCards: t.yellowCards || 0,
      redCards: t.redCards || 0,
      foulsCommitted: t.foulsCommitted || 0,
      foulsDrawn: t.foulsDrawn || 0,
    },
    goalkeeping: isGoalkeeper
      ? {
          saves: t.saves || 0,
          cleanSheets: t.cleanSheets || 0,
          goalsConceded: t.goalsConceded || 0,
          penaltiesSaved: t.penaltiesSaved || 0,
        }
      : null,
    recentForm,
  };
}

// ══════════════════════════════════════════
// MY CONTRACTS (with signing capability)
// ══════════════════════════════════════════

export async function getMyContracts(userId: string) {
  const player = await getLinkedPlayer(userId);
  const playerId = getPlayerId(player);

  const contracts = await Contract.findAll({
    where: { playerId },
    include: [
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr", "logoUrl"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  return { contracts };
}

export async function signMyContract(
  userId: string,
  contractId: string,
  action: "sign_digital" | "sign_upload",
  signatureData?: string,
  signedDocumentUrl?: string,
) {
  const player = await getLinkedPlayer(userId);
  const playerId = getPlayerId(player);

  // Wrap in transaction with row-level lock to prevent race conditions
  const result = await sequelize.transaction(async (t) => {
    // SELECT ... FOR UPDATE — prevents concurrent signing attempts
    const contract = await Contract.findByPk(contractId, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!contract) throw new AppError("Contract not found", 404);

    // Ensure this contract belongs to the player
    if (contract.playerId !== playerId) {
      throw new AppError("You are not authorized to sign this contract", 403);
    }

    // ── Player signs when status is 'AwaitingPlayer' ──
    if (contract.status !== "AwaitingPlayer") {
      throw new AppError(
        "This contract is not awaiting your signature. Current status: " +
          contract.status,
        400,
      );
    }

    // ── Prevent overlapping active contracts for the same player ──
    const overlap = await Contract.findOne({
      where: {
        playerId,
        id: { [Op.ne]: contractId },
        status: { [Op.in]: ["Active", "Expiring Soon"] },
        startDate: { [Op.lte]: contract.endDate },
        endDate: { [Op.gte]: contract.startDate },
      },
      transaction: t,
    });
    if (overlap) {
      throw new AppError(
        "Cannot activate — this player already has an active contract with overlapping dates",
        409,
      );
    }

    const updatePayload: Record<string, unknown> = {
      status: "Active",
      signedAt: new Date(),
      commissionLocked: true, // Lock commission once both parties have signed
    };

    if (action === "sign_digital") {
      if (!signatureData)
        throw new AppError(
          "Signature data is required for digital signing",
          400,
        );
      updatePayload.signedDocumentUrl = signatureData;
      updatePayload.signingMethod = "digital";
    } else {
      if (!signedDocumentUrl)
        throw new AppError(
          "Signed document URL is required for upload signing",
          400,
        );
      updatePayload.signedDocumentUrl = signedDocumentUrl;
      updatePayload.signingMethod = "upload";
    }

    await contract.update(updatePayload, { transaction: t });

    return contract;
  });

  // ── Regenerate signed PDF with both signatures embedded ──
  try {
    const signedPdfUrl = await regenerateSignedPdf(contractId);
    await Contract.update(
      { documentUrl: signedPdfUrl },
      { where: { id: contractId } },
    );
  } catch (err: any) {
    logger.error("Failed to generate signed PDF after player signing", {
      error: err.message,
    });
    // Non-blocking — contract activation already succeeded
  }

  return result;
}

// ══════════════════════════════════════════
// INVITE: Generate invite link for a player
// ══════════════════════════════════════════

export async function generatePlayerInvite(
  playerId: string,
  generatedBy: string,
) {
  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError("Player not found", 404);

  // Try the model value first (afterFind hook should have decrypted it)
  let email = player.email;

  // If afterFind silently nulled the email (decryption failure), read the raw value
  if (!email) {
    const [raw] = await sequelize.query<{ email: string }>(
      `SELECT email FROM players WHERE id = :playerId LIMIT 1`,
      { replacements: { playerId }, type: QueryTypes.SELECT },
    );
    const rawEmail = raw?.email;
    if (rawEmail && isEncrypted(rawEmail)) {
      try {
        email = decrypt(rawEmail);
      } catch {
        email = null;
      }
    } else {
      email = rawEmail || null;
    }
  }

  // Also handle the case where afterFind returned an encrypted string
  if (email && isEncrypted(email)) {
    try {
      email = decrypt(email);
    } catch {
      email = null;
    }
  }

  if (!email)
    throw new AppError("Player must have an email to generate an invite", 400);

  // ── Check for existing User account ──
  const existingUser = await User.findOne({
    where: { [Op.or]: [{ email }, { playerId }] } as any,
  });

  if (existingUser) {
    // If the user is inactive with an expired/missing token, regenerate the invite
    const tokenExpired =
      !existingUser.inviteToken ||
      (existingUser.inviteTokenExpiry &&
        new Date(existingUser.inviteTokenExpiry).getTime() < Date.now());

    if (!existingUser.isActive && tokenExpired) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      await existingUser.update({
        inviteToken: hashedToken,
        inviteTokenExpiry: expiry,
        playerId: player.id,
      } as any);

      const inviteLink = `${env.frontend.url}/player/register?token=${token}`;
      return {
        inviteLink,
        token,
        expiresAt: expiry,
        playerName: `${player.firstName} ${player.lastName}`,
        playerEmail: email,
      };
    }

    if (existingUser.isActive) {
      throw new AppError(
        "A user account already exists and is active for this player",
        409,
      );
    }

    // User exists, inactive but token not expired — still pending
    throw new AppError(
      "An invite is already pending for this player. Use resend if needed.",
      409,
    );
  }

  // ── Auto-create player_accounts row if missing ──
  const existingAccount = await PlayerAccount.findOne({
    where: { playerId },
    attributes: ["id"],
  });

  if (!existingAccount) {
    const placeholderHash = await bcrypt.hash(
      crypto.randomBytes(32).toString("hex"),
      env.bcrypt.saltRounds,
    );
    await PlayerAccount.create({
      playerId,
      email,
      passwordHash: placeholderHash,
      status: "pending",
    });
  }

  // ── Create User record with invite token ──
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const placeholderPassword = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(
    placeholderPassword,
    env.bcrypt.saltRounds,
  );

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  await User.create({
    email,
    passwordHash,
    fullName: `${player.firstName} ${player.lastName}`,
    fullNameAr:
      player.firstNameAr && player.lastNameAr
        ? `${player.firstNameAr} ${player.lastNameAr}`
        : undefined,
    role: "Player",
    isActive: false,
    inviteToken: hashedToken,
    inviteTokenExpiry: expiry,
    playerId: player.id,
  } as any);

  const inviteLink = `${env.frontend.url}/player/register?token=${token}`;

  return {
    inviteLink,
    token,
    expiresAt: expiry,
    playerName: `${player.firstName} ${player.lastName}`,
    playerEmail: email,
  };
}

// ══════════════════════════════════════════
// SELF-REGISTER: Player completes registration via invite link
// ══════════════════════════════════════════

export async function completePlayerRegistration(
  token: string,
  password: string,
) {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    where: {
      inviteToken: hashedToken,
      inviteTokenExpiry: { [Op.gt]: new Date() },
    } as any,
  });

  if (!user) throw new AppError("Invalid or expired invite link", 400);

  const hashedPassword = await bcrypt.hash(password, env.bcrypt.saltRounds);

  await (user as any).update({
    passwordHash: hashedPassword,
    isActive: true,
    inviteToken: null,
    inviteTokenExpiry: null,
  });

  // Activate the player_accounts row if one exists
  const userPlayerId = (user as any).playerId;
  if (userPlayerId) {
    await PlayerAccount.update(
      { status: "active", passwordHash: hashedPassword },
      { where: { playerId: userPlayerId, status: { [Op.ne]: "active" } } },
    );
  }

  return {
    message: "Registration complete. You can now log in.",
    email: user.email,
  };
}

// ══════════════════════════════════════════
// UPDATE MY PROFILE (editable fields only)
// ══════════════════════════════════════════

const EDITABLE_FIELDS = [
  "phone",
  "guardianName",
  "guardianPhone",
  "guardianRelation",
  "heightCm",
  "weightKg",
] as const;

export async function updateMyProfile(
  userId: string,
  updates: Partial<Record<(typeof EDITABLE_FIELDS)[number], unknown>>,
) {
  const player = await getLinkedPlayer(userId);

  const safeUpdates: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) {
      safeUpdates[field] = updates[field];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    throw new AppError("No valid fields to update", 400);
  }

  await player.update(safeUpdates);
  return player;
}

// ══════════════════════════════════════════
// MY INJURIES (injury history)
// ══════════════════════════════════════════

export async function getMyInjuries(userId: string) {
  const player = await getLinkedPlayer(userId);
  const playerId = getPlayerId(player);

  const injuries = await Injury.findAll({
    where: { playerId },
    include: [
      {
        model: InjuryUpdate,
        as: "updates",
        order: [["updateDate", "DESC"]],
      },
    ],
    order: [["injuryDate", "DESC"]],
  });

  const active = injuries.filter(
    (i: any) => i.status === "UnderTreatment",
  ).length;

  const recovered = injuries.filter(
    (i: any) => i.status === "Recovered" && i.actualDaysOut,
  );
  const avgRecovery =
    recovered.length > 0
      ? Math.round(
          recovered.reduce(
            (s: number, i: any) => s + (i.actualDaysOut || 0),
            0,
          ) / recovered.length,
        )
      : 0;

  return {
    injuries,
    total: injuries.length,
    active,
    avgRecoveryDays: avgRecovery,
  };
}

// ══════════════════════════════════════════
// ADMIN: List all player accounts
// ══════════════════════════════════════════

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export async function listPlayerAccounts() {
  const now = Date.now();

  // ── Source 1: Users table (invite-based player accounts) ──
  const userAccounts = await User.findAll({
    where: { role: "Player" },
    attributes: [
      "id",
      "email",
      "fullName",
      "fullNameAr",
      "isActive",
      "lastLogin",
      "lastActivity",
      "playerId",
      "inviteToken",
      "inviteTokenExpiry",
      "createdAt",
    ],
    order: [["createdAt", "DESC"]],
  });

  const fromUsers = userAccounts.map((a) => {
    const hasToken = !!a.inviteToken;
    const tokenExpired = a.inviteTokenExpiry
      ? new Date(a.inviteTokenExpiry).getTime() < now
      : false;

    let status: "active" | "pending" | "expired" | "disabled";
    if (!a.isActive && hasToken && !tokenExpired) status = "pending";
    else if (!a.isActive && hasToken && tokenExpired) status = "expired";
    else if (!a.isActive) status = "disabled";
    else status = "active";

    const lastAct = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const isOnline = status === "active" && now - lastAct < ONLINE_THRESHOLD_MS;

    return {
      id: a.id,
      email: a.email,
      fullName: a.fullName,
      fullNameAr: a.fullNameAr,
      playerId: a.playerId,
      status,
      isOnline,
      lastLogin: a.lastLogin,
      lastActivity: a.lastActivity,
      createdAt: (a as any).createdAt,
    };
  });

  // ── Source 2: player_accounts table (direct player login) ──
  // Exclude any that already have a matching user in the users table
  const userPlayerIds = userAccounts
    .map((u) => u.playerId)
    .filter(Boolean) as string[];

  const paRows = await sequelize.query<{
    id: string;
    player_id: string;
    email: string;
    status: string;
    last_login: string | null;
    created_at: string;
    first_name: string | null;
    last_name: string | null;
    first_name_ar: string | null;
    last_name_ar: string | null;
  }>(
    `SELECT pa.id, pa.player_id, pa.email, pa.status, pa.last_login, pa.created_at,
            p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
     FROM player_accounts pa
     LEFT JOIN players p ON pa.player_id = p.id
     ${userPlayerIds.length > 0 ? "WHERE pa.player_id NOT IN (:excludeIds)" : ""}
     ORDER BY pa.created_at DESC`,
    {
      replacements:
        userPlayerIds.length > 0 ? { excludeIds: userPlayerIds } : undefined,
      type: QueryTypes.SELECT,
    },
  );

  const fromPlayerAccounts = paRows.map((pa) => {
    const paStatus = pa.status as "active" | "pending" | "expired" | "disabled";
    const lastLogin = pa.last_login ? new Date(pa.last_login).getTime() : 0;
    const isOnline =
      paStatus === "active" && now - lastLogin < ONLINE_THRESHOLD_MS;

    const fullName =
      [pa.first_name, pa.last_name].filter(Boolean).join(" ") || pa.email;
    const fullNameAr =
      [pa.first_name_ar, pa.last_name_ar].filter(Boolean).join(" ") || null;

    return {
      id: pa.id,
      email: pa.email,
      fullName,
      fullNameAr,
      playerId: pa.player_id,
      status: paStatus,
      isOnline,
      lastLogin: pa.last_login,
      lastActivity: pa.last_login, // player_accounts doesn't track lastActivity separately
      createdAt: pa.created_at,
    };
  });

  return [...fromUsers, ...fromPlayerAccounts];
}

// ══════════════════════════════════════════
// ADMIN: Get single player account
// ══════════════════════════════════════════

export async function getPlayerAccount(accountId: string) {
  const account = await User.findByPk(accountId, {
    attributes: [
      "id",
      "email",
      "fullName",
      "fullNameAr",
      "isActive",
      "lastLogin",
      "lastActivity",
      "playerId",
      "inviteToken",
      "inviteTokenExpiry",
      "createdAt",
    ],
  });
  if (!account || account.role !== "Player")
    throw new AppError("Player account not found", 404);

  return account;
}

// ══════════════════════════════════════════
// ADMIN: Update player account (toggle active, reset password)
// ══════════════════════════════════════════

export async function updatePlayerAccount(
  accountId: string,
  input: { isActive?: boolean; password?: string },
) {
  // Try users table first (invite-based accounts)
  const account = await User.findByPk(accountId);
  if (account && account.role === "Player") {
    const updates: Record<string, unknown> = {};

    if (input.isActive !== undefined) {
      updates.isActive = input.isActive;
    }

    if (input.password) {
      updates.passwordHash = await bcrypt.hash(
        input.password,
        env.bcrypt.saltRounds,
      );
      updates.failedLoginAttempts = 0;
      updates.lockedUntil = null;
    }

    await account.update(updates);
    return { id: account.id, email: account.email, isActive: account.isActive };
  }

  // Try player_accounts table (direct login accounts)
  const pa = await PlayerAccount.findByPk(accountId);
  if (pa) {
    const paUpdates: Record<string, unknown> = {};

    if (input.isActive !== undefined) {
      paUpdates.status = input.isActive ? "active" : "disabled";
    }

    if (input.password) {
      paUpdates.passwordHash = await bcrypt.hash(
        input.password,
        env.bcrypt.saltRounds,
      );
      paUpdates.failedLoginAttempts = 0;
      paUpdates.lockedUntil = null;
    }

    await pa.update(paUpdates);
    return {
      id: pa.id,
      email: pa.email,
      isActive: input.isActive ?? pa.status === "active",
    };
  }

  throw new AppError("Player account not found", 404);
}

// ══════════════════════════════════════════
// ADMIN: Delete player account
// ══════════════════════════════════════════

export async function deletePlayerAccount(accountId: string) {
  // Try users table first (invite-based accounts)
  const account = await User.findByPk(accountId);
  if (account && account.role === "Player") {
    await account.destroy();
    return { id: accountId };
  }

  // Try player_accounts table (direct login accounts)
  const pa = await PlayerAccount.findByPk(accountId);
  if (pa) {
    await pa.destroy();
    return { id: accountId };
  }

  throw new AppError("Player account not found", 404);
}

// ══════════════════════════════════════════
// ADMIN: Resend invite (regenerate token)
// ══════════════════════════════════════════

export async function resendPlayerInvite(accountId: string) {
  const account = await User.findByPk(accountId);
  if (!account || account.role !== "Player")
    throw new AppError("Player account not found", 404);

  if (account.isActive)
    throw new AppError("Account is already active — no invite needed", 400);

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  await account.update({
    inviteToken: hashedToken,
    inviteTokenExpiry: expiry,
  } as any);

  const inviteLink = `${env.frontend.url}/player/register?token=${token}`;

  return {
    inviteLink,
    token,
    expiresAt: expiry,
    email: account.email,
    fullName: account.fullName,
  };
}
