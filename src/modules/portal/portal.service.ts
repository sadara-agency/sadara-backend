import { Op, QueryTypes } from 'sequelize';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sequelize } from '../../config/database';
import { env } from '../../config/env';
import { Player } from '../players/player.model';
import { Club } from '../clubs/club.model';
import { User } from '../Users/user.model';
import { Contract } from '../contracts/contract.model';
import { Match } from '../matches/match.model';
import { Document } from '../documents/document.model';
import { Gate, GateChecklist } from '../gates/gate.model';
import { Task } from '../tasks/task.model';
import { AppError } from '../../middleware/errorHandler';

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
  const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role'] });

  if (user) {
    if (user.role !== 'Player') {
      throw new AppError('This endpoint is for player accounts only', 403);
    }

    const playerId = (user as any).playerId;
    if (playerId) {
      const player = await Player.findByPk(playerId);
      if (player) return player;
    }

    const player = await Player.findOne({ where: { email: user.email } });
    if (!player) {
      throw new AppError('No player profile linked to this account. Contact your agent.', 404);
    }

    await (user as any).update({ playerId: player.id });
    return player;
  }

  // ── Path 2: Check the player_accounts table ──
  const accounts = await sequelize.query<{ player_id: string; status: string }>(
    `SELECT player_id, status FROM player_accounts WHERE id = :userId LIMIT 1`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  const account = accounts[0];
  if (!account) {
    throw new AppError('User not found', 404);
  }

  if (account.status !== 'active') {
    throw new AppError('Account is not yet activated', 403);
  }

  const player = await Player.findByPk(account.player_id);
  if (!player) {
    throw new AppError('No player profile linked to this account. Contact your agent.', 404);
  }

  return player;
}

/**
 * Safely extract the player's UUID string from a Sequelize instance.
 * Prevents "undefined" issues when passing to WHERE clauses or raw SQL.
 */
function getPlayerId(player: Player): string {
  const id = player.getDataValue('id') ?? (player as any).id;
  if (!id) throw new AppError('Player record has no ID', 500);
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
      { model: Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl', 'league', 'city', 'stadium'] },
      { model: User, as: 'agent', attributes: ['id', 'fullName', 'fullNameAr', 'email'] },
    ],
  });

  // Get active contract
  const activeContract = await Contract.findOne({
    where: { playerId, status: 'Active' },
    include: [{ model: Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl'] }],
    order: [['endDate', 'DESC']],
  });

  // Get quick stats via raw SQL (safe — playerId is a verified string)
  const [stats] = await sequelize.query<any>(
    `SELECT
      COALESCE((SELECT COUNT(*) FROM contracts WHERE player_id = :id AND status = 'Active'), 0) AS "activeContracts",
      COALESCE((SELECT COUNT(*) FROM documents WHERE player_id = :id), 0) AS "totalDocuments",
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
      { model: Club, as: 'homeClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
      { model: Club, as: 'awayClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
    ],
    order: [['matchDate', 'ASC']],
    limit: 10,
  });

  const past = await Match.findAll({
    where: {
      [Op.or]: [{ homeClubId: clubId }, { awayClubId: clubId }],
      matchDate: { [Op.lt]: now },
    },
    include: [
      { model: Club, as: 'homeClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
      { model: Club, as: 'awayClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
    ],
    order: [['matchDate', 'DESC']],
    limit: 10,
  });

  const tasks = await Task.findAll({
    where: { playerId, status: { [Op.ne]: 'Completed' } },
    order: [['dueDate', 'ASC']],
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
    where: { playerId },
    include: [
      { model: User, as: 'uploader', attributes: ['id', 'fullName'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  const grouped = {
    contracts: documents.filter((d: any) => d.type === 'Contract' || d.type === 'contract'),
    identity: documents.filter((d: any) => ['ID', 'Passport', 'id', 'passport'].includes(d.type)),
    medical: documents.filter((d: any) => ['Medical', 'medical', 'Fitness'].includes(d.type)),
    other: documents.filter((d: any) =>
      !['Contract', 'contract', 'ID', 'Passport', 'id', 'passport', 'Medical', 'medical', 'Fitness'].includes(d.type)
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
      { model: GateChecklist, as: 'checklist', order: [['sortOrder', 'ASC']] },
      { model: User, as: 'approver', attributes: ['id', 'fullName', 'fullNameAr'] },
    ],
    order: [['gateNumber', 'ASC']],
  });

  const passedGates = gates.filter((g: any) => g.status === 'Completed');
  const currentGateNumber = passedGates.length > 0
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
  const isGoalkeeper = player.position === 'GK';

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
      ${isGoalkeeper ? `,
      COALESCE(SUM(saves), 0)::INT                AS "saves",
      COUNT(*) FILTER (WHERE clean_sheet = true)::INT AS "cleanSheets",
      COALESCE(SUM(goals_conceded), 0)::INT       AS "goalsConceded",
      COALESCE(SUM(penalties_saved), 0)::INT      AS "penaltiesSaved"
      ` : ''}
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
      ${isGoalkeeper ? `,
      pms.saves,
      pms.clean_sheet     AS "cleanSheet",
      pms.goals_conceded  AS "goalsConceded",
      pms.penalties_saved  AS "penaltiesSaved"
      ` : ''}
    FROM player_match_stats pms
    JOIN matches m ON m.id = pms.match_id
    LEFT JOIN clubs hc ON hc.id = m.home_club_id
    LEFT JOIN clubs ac ON ac.id = m.away_club_id
    WHERE pms.player_id = :playerId
    ORDER BY m.match_date DESC
    LIMIT 10`,
    { replacements: { playerId, clubId: player.currentClubId || '' }, type: QueryTypes.SELECT },
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
    goalkeeping: isGoalkeeper ? {
      saves: t.saves || 0,
      cleanSheets: t.cleanSheets || 0,
      goalsConceded: t.goalsConceded || 0,
      penaltiesSaved: t.penaltiesSaved || 0,
    } : null,
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
      { model: Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  return { contracts };
}

export async function signMyContract(
  userId: string,
  contractId: string,
  action: 'sign_digital' | 'sign_upload',
  signatureData?: string,
  signedDocumentUrl?: string,
) {
  const player = await getLinkedPlayer(userId);
  const playerId = getPlayerId(player);

  const contract = await Contract.findByPk(contractId);
  if (!contract) throw new AppError('Contract not found', 404);

  // Ensure this contract belongs to the player
  if (contract.playerId !== playerId) {
    throw new AppError('You are not authorized to sign this contract', 403);
  }

  if (contract.status !== 'Signing') {
    throw new AppError('This contract is not in signing status', 400);
  }

  const updatePayload: Record<string, unknown> = {
    status: 'Active',
    signedAt: new Date(),
  };

  if (action === 'sign_digital') {
    if (!signatureData) throw new AppError('Signature data is required for digital signing', 400);
    updatePayload.signedDocumentUrl = signatureData;
    updatePayload.signingMethod = 'digital';
  } else {
    if (!signedDocumentUrl) throw new AppError('Signed document URL is required for upload signing', 400);
    updatePayload.signedDocumentUrl = signedDocumentUrl;
    updatePayload.signingMethod = 'upload';
  }

  await contract.update(updatePayload);

  return contract;
}

// ══════════════════════════════════════════
// INVITE: Generate invite link for a player
// ══════════════════════════════════════════

export async function generatePlayerInvite(playerId: string, generatedBy: string) {
  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError('Player not found', 404);
  if (!player.email) throw new AppError('Player must have an email to generate an invite', 400);

  const existingUser = await User.findOne({
    where: { [Op.or]: [{ email: player.email }, { playerId }] } as any,
  });
  if (existingUser) throw new AppError('A user account already exists for this player', 409);

  const existingAccount = await sequelize.query<{ id: string }>(
    `SELECT id FROM player_accounts WHERE player_id = :playerId OR email = :email LIMIT 1`,
    { replacements: { playerId, email: player.email }, type: QueryTypes.SELECT },
  );
  if (existingAccount[0]) throw new AppError('A player account already exists for this player', 409);

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const placeholderPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(placeholderPassword, env.bcrypt.saltRounds);

  await User.create({
    email: player.email,
    passwordHash,
    fullName: `${player.firstName} ${player.lastName}`,
    fullNameAr: player.firstNameAr && player.lastNameAr
      ? `${player.firstNameAr} ${player.lastNameAr}` : undefined,
    role: 'Player',
    isActive: false,
    inviteToken: token,
    inviteTokenExpiry: expiry,
    playerId: player.id,
  } as any);

  const inviteLink = `${env.frontend.url}/player/register?token=${token}`;

  return {
    inviteLink,
    token,
    expiresAt: expiry,
    playerName: `${player.firstName} ${player.lastName}`,
    playerEmail: player.email,
  };
}

// ══════════════════════════════════════════
// SELF-REGISTER: Player completes registration via invite link
// ══════════════════════════════════════════

export async function completePlayerRegistration(token: string, password: string) {
  const user = await User.findOne({
    where: {
      inviteToken: token,
      inviteTokenExpiry: { [Op.gt]: new Date() },
    } as any,
  });

  if (!user) throw new AppError('Invalid or expired invite link', 400);

  const hashedPassword = await bcrypt.hash(password, 12);

  await (user as any).update({
    passwordHash: hashedPassword,
    isActive: true,
    inviteToken: null,
    inviteTokenExpiry: null,
  });

  return { message: 'Registration complete. You can now log in.', email: user.email };
}