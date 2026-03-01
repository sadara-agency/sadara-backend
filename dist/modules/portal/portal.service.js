"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLinkedPlayer = getLinkedPlayer;
exports.getMyProfile = getMyProfile;
exports.getMySchedule = getMySchedule;
exports.getMyDocuments = getMyDocuments;
exports.getMyDevelopment = getMyDevelopment;
exports.generatePlayerInvite = generatePlayerInvite;
exports.completePlayerRegistration = completePlayerRegistration;
const sequelize_1 = require("sequelize");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../config/database");
const player_model_1 = require("../players/player.model");
const club_model_1 = require("../clubs/club.model");
const user_model_1 = require("../Users/user.model");
const contract_model_1 = require("../contracts/contract.model");
const match_model_1 = require("../matches/match.model");
const document_model_1 = require("../documents/document.model");
const gate_model_1 = require("../gates/gate.model");
const task_model_1 = require("../tasks/task.model");
const errorHandler_1 = require("../../middleware/errorHandler");
// ══════════════════════════════════════════
// RESOLVE: User → Player
// ══════════════════════════════════════════
/**
 * Get the player record linked to a user account.
 * Looks up via users.player_id first, then falls back to matching email.
 */
async function getLinkedPlayer(userId) {
    // 1. Direct link via users.player_id
    const user = await user_model_1.User.findByPk(userId, { attributes: ['id', 'email', 'role'] });
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    if (user.role !== 'Player')
        throw new errorHandler_1.AppError('This endpoint is for player accounts only', 403);
    const playerId = user.playerId;
    if (playerId) {
        const player = await player_model_1.Player.findByPk(playerId);
        if (player)
            return player;
    }
    // 2. Fallback: match by email
    const player = await player_model_1.Player.findOne({ where: { email: user.email } });
    if (!player)
        throw new errorHandler_1.AppError('No player profile linked to this account. Contact your agent.', 404);
    // Auto-link for future lookups
    await user.update({ playerId: player.id });
    return player;
}
// ══════════════════════════════════════════
// MY PROFILE
// ══════════════════════════════════════════
async function getMyProfile(userId) {
    const player = await getLinkedPlayer(userId);
    const profile = await player_model_1.Player.findByPk(player.id, {
        include: [
            { model: club_model_1.Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl', 'league', 'city', 'stadium'] },
            { model: user_model_1.User, as: 'agent', attributes: ['id', 'fullName', 'fullNameAr', 'email'] },
        ],
    });
    // Get active contract
    const activeContract = await contract_model_1.Contract.findOne({
        where: { playerId: player.id, status: 'Active' },
        include: [{ model: club_model_1.Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl'] }],
        order: [['endDate', 'DESC']],
    });
    // Get quick stats
    const [stats] = await database_1.sequelize.query(`SELECT
      COALESCE((SELECT COUNT(*) FROM contracts WHERE player_id = :id AND status = 'Active'), 0) AS "activeContracts",
      COALESCE((SELECT COUNT(*) FROM documents WHERE player_id = :id), 0) AS "totalDocuments",
      COALESCE((SELECT COUNT(*) FROM tasks WHERE player_id = :id AND status != 'Completed'), 0) AS "openTasks",
      COALESCE((SELECT MAX(gate_number) FROM gates WHERE player_id = :id AND status = 'Passed'), -1) AS "currentGate"
    `, { replacements: { id: player.id }, type: sequelize_1.QueryTypes.SELECT });
    return {
        player: profile,
        contract: activeContract,
        stats: stats || {},
    };
}
// ══════════════════════════════════════════
// MY SCHEDULE (upcoming matches)
// ══════════════════════════════════════════
async function getMySchedule(userId, query = {}) {
    const player = await getLinkedPlayer(userId);
    const clubId = player.currentClubId;
    if (!clubId)
        return { upcoming: [], past: [] };
    const now = new Date();
    // Upcoming matches for player's club
    const upcoming = await match_model_1.Match.findAll({
        where: {
            [sequelize_1.Op.or]: [{ homeClubId: clubId }, { awayClubId: clubId }],
            matchDate: { [sequelize_1.Op.gte]: now },
        },
        include: [
            { model: club_model_1.Club, as: 'homeClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
            { model: club_model_1.Club, as: 'awayClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
        ],
        order: [['matchDate', 'ASC']],
        limit: 10,
    });
    // Recent past matches
    const past = await match_model_1.Match.findAll({
        where: {
            [sequelize_1.Op.or]: [{ homeClubId: clubId }, { awayClubId: clubId }],
            matchDate: { [sequelize_1.Op.lt]: now },
        },
        include: [
            { model: club_model_1.Club, as: 'homeClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
            { model: club_model_1.Club, as: 'awayClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
        ],
        order: [['matchDate', 'DESC']],
        limit: 10,
    });
    // Tasks assigned to this player
    const tasks = await task_model_1.Task.findAll({
        where: { playerId: player.id, status: { [sequelize_1.Op.ne]: 'Completed' } },
        order: [['dueDate', 'ASC']],
        limit: 10,
    });
    return { upcoming, past, tasks };
}
// ══════════════════════════════════════════
// MY DOCUMENTS (read-only)
// ══════════════════════════════════════════
async function getMyDocuments(userId) {
    const player = await getLinkedPlayer(userId);
    const documents = await document_model_1.Document.findAll({
        where: { playerId: player.id },
        include: [
            { model: user_model_1.User, as: 'uploader', attributes: ['id', 'fullName'] },
        ],
        order: [['createdAt', 'DESC']],
    });
    // Group by type
    const grouped = {
        contracts: documents.filter((d) => d.type === 'Contract' || d.type === 'contract'),
        identity: documents.filter((d) => ['ID', 'Passport', 'id', 'passport'].includes(d.type)),
        medical: documents.filter((d) => ['Medical', 'medical', 'Fitness'].includes(d.type)),
        other: documents.filter((d) => !['Contract', 'contract', 'ID', 'Passport', 'id', 'passport', 'Medical', 'medical', 'Fitness'].includes(d.type)),
    };
    return { documents, grouped, total: documents.length };
}
// ══════════════════════════════════════════
// MY DEVELOPMENT PLAN (IDP + Gates)
// ══════════════════════════════════════════
async function getMyDevelopment(userId) {
    const player = await getLinkedPlayer(userId);
    // Gates with checklists
    const gates = await gate_model_1.Gate.findAll({
        where: { playerId: player.id },
        include: [
            { model: gate_model_1.GateChecklist, as: 'checklist', order: [['sortOrder', 'ASC']] },
            { model: user_model_1.User, as: 'approver', attributes: ['id', 'fullName', 'fullNameAr'] },
        ],
        order: [['gateNumber', 'ASC']],
    });
    // Current gate = highest passed + 1 (or 0 if none passed)
    const passedGates = gates.filter((g) => g.status === 'Passed');
    const currentGateNumber = passedGates.length > 0
        ? Math.max(...passedGates.map((g) => g.gateNumber)) + 1
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
async function generatePlayerInvite(playerId, generatedBy) {
    const player = await player_model_1.Player.findByPk(playerId);
    if (!player)
        throw new errorHandler_1.AppError('Player not found', 404);
    if (!player.email)
        throw new errorHandler_1.AppError('Player must have an email to generate an invite', 400);
    // Check if user already exists for this player
    const existingUser = await user_model_1.User.findOne({
        where: { [sequelize_1.Op.or]: [{ email: player.email }, { playerId }] },
    });
    if (existingUser)
        throw new errorHandler_1.AppError('A user account already exists for this player', 409);
    // Generate token
    const token = crypto_1.default.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    // Create a placeholder user with invite token
    const user = await user_model_1.User.create({
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
    });
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
async function completePlayerRegistration(token, password) {
    const user = await user_model_1.User.findOne({
        where: {
            inviteToken: token,
            inviteTokenExpiry: { [sequelize_1.Op.gt]: new Date() },
        },
    });
    if (!user)
        throw new errorHandler_1.AppError('Invalid or expired invite link', 400);
    const hashedPassword = await bcryptjs_1.default.hash(password, 12);
    await user.update({
        passwordHash: hashedPassword,
        isActive: true,
        inviteToken: null,
        inviteTokenExpiry: null,
    });
    return { message: 'Registration complete. You can now log in.', email: user.email };
}
//# sourceMappingURL=portal.service.js.map