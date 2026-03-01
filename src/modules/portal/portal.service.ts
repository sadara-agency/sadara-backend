import { Op, QueryTypes } from 'sequelize';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sequelize } from '../../config/database';
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
 * Looks up via users.player_id first, then falls back to matching email.
 */
export async function getLinkedPlayer(userId: string): Promise<Player> {
  // 1. Direct link via users.player_id
  const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role'] });
  if (!user) throw new AppError('User not found', 404);
  if (user.role !== 'Player') throw new AppError('This endpoint is for player accounts only', 403);

  const playerId = (user as any).playerId;
  if (playerId) {
    const player = await Player.findByPk(playerId);
    if (player) return player;
  }

  // 2. Fallback: match by email
  const player = await Player.findOne({ where: { email: user.email } });
  if (!player) throw new AppError('No player profile linked to this account. Contact your agent.', 404);

  // Auto-link for future lookups
  await (user as any).update({ playerId: player.id });

  return player;
}

// ══════════════════════════════════════════
// MY PROFILE
// ══════════════════════════════════════════

export async function getMyProfile(userId: string) {
  const player = await getLinkedPlayer(userId);

  const profile = await Player.findByPk(player.id, {
    include: [
      { model: Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl', 'league', 'city', 'stadium'] },
      { model: User, as: 'agent', attributes: ['id', 'fullName', 'fullNameAr', 'email'] },
    ],
  });

  // Get active contract
  const activeContract = await Contract.findOne({
    where: { playerId: player.id, status: 'Active' },
    include: [{ model: Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl'] }],
    order: [['endDate', 'DESC']],
  });

  // Get quick stats
  const [stats] = await sequelize.query<any>(
    `SELECT
      COALESCE((SELECT COUNT(*) FROM contracts WHERE player_id = :id AND status = 'Active'), 0) AS "activeContracts",
      COALESCE((SELECT COUNT(*) FROM documents WHERE player_id = :id), 0) AS "totalDocuments",
      COALESCE((SELECT COUNT(*) FROM tasks WHERE player_id = :id AND status != 'Completed'), 0) AS "openTasks",
      COALESCE((SELECT MAX(gate_number) FROM gates WHERE player_id = :id AND status = 'Passed'), -1) AS "currentGate"
    `,
    { replacements: { id: player.id }, type: QueryTypes.SELECT },
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
  const clubId = player.currentClubId;

  if (!clubId) return { upcoming: [], past: [] };

  const now = new Date();

  // Upcoming matches for player's club
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

  // Recent past matches
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

  // Tasks assigned to this player
  const tasks = await Task.findAll({
    where: { playerId: player.id, status: { [Op.ne]: 'Completed' } },
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

  const documents = await Document.findAll({
    where: { playerId: player.id },
    include: [
      { model: User, as: 'uploader', attributes: ['id', 'fullName'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  // Group by type
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

  // Gates with checklists
  const gates = await Gate.findAll({
    where: { playerId: player.id },
    include: [
      { model: GateChecklist, as: 'checklist', order: [['sortOrder', 'ASC']] },
      { model: User, as: 'approver', attributes: ['id', 'fullName', 'fullNameAr'] },
    ],
    order: [['gateNumber', 'ASC']],
  });

  // Current gate = highest passed + 1 (or 0 if none passed)
  const passedGates = gates.filter((g: any) => g.status === 'Passed');
  const currentGateNumber = passedGates.length > 0
    ? Math.max(...passedGates.map((g: any) => g.gateNumber)) + 1
    : 0;

  // Gate progress percentage
  const totalGates = 4; // 0, 1, 2, 3
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
// INVITE: Generate invite link for a player
// ══════════════════════════════════════════

export async function generatePlayerInvite(playerId: string, generatedBy: string) {
  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError('Player not found', 404);
  if (!player.email) throw new AppError('Player must have an email to generate an invite', 400);

  // Check if user already exists for this player
  const existingUser = await User.findOne({
    where: { [Op.or]: [{ email: player.email }, { playerId }] } as any,
  });
  if (existingUser) throw new AppError('A user account already exists for this player', 409);

  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create a placeholder user with invite token
  const user = await User.create({
    email: player.email,
    passwordHash: '', // Will be set during registration
    fullName: `${player.firstName} ${player.lastName}`,
    fullNameAr: player.firstNameAr && player.lastNameAr
      ? `${player.firstNameAr} ${player.lastNameAr}` : undefined,
    role: 'Player',
    isActive: false, // Activated on registration
    inviteToken: token,
    inviteTokenExpiry: expiry,
    playerId: player.id,
  } as any);

  const inviteLink = `${process.env.FRONTEND_URL || 'https://platform.sadarasport.sa'}/player/register?token=${token}`;

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