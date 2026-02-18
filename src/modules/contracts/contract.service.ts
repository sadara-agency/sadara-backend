// ─────────────────────────────────────────────────────────────
// src/modules/contracts/contract.service.ts
// Business logic for Contract CRUD.
//
// Replaces all raw SQL from the old contract.routes.ts with
// Sequelize ORM queries. Key behaviors preserved:
//   - Player name + club name via eager loading
//   - days_remaining computed as a virtual field
//   - totalCommission auto-calculated on create
//   - Milestones fetched for getById (raw SQL until model exists)
// ─────────────────────────────────────────────────────────────
import { Op, Sequelize, QueryTypes, literal } from 'sequelize';
import { Contract } from './contract.model';
import { Player } from '../players/player.model';
import { Club } from '../clubs/club.model';
import { User } from '../Users/user.model';
import { sequelize } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { CreateContractInput, UpdateContractInput } from './contract.schema';

// ── Shared includes for player + club ──
const CONTRACT_INCLUDES = [
  {
    model: Player,
    as: 'player',
    attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl'],
  },
  {
    model: Club,
    as: 'club',
    attributes: ['id', 'name', 'nameAr', 'logoUrl'],
  },
  {
    model: User,
    as: 'creator',
    attributes: ['id', 'fullName', 'fullNameAr'],
  },
];

// ── Helper: compute days remaining and attach to plain object ──
function enrichContract(contract: any) {
  const plain = contract.get ? contract.get({ plain: true }) : contract;
  const endDate = new Date(plain.endDate);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  plain.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return plain;
}

// ────────────────────────────────────────────────────────────
// List Contracts
// ────────────────────────────────────────────────────────────
export async function listContracts(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'createdAt');

  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.category) where.category = queryParams.category;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.clubId) where.clubId = queryParams.clubId;

  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { title: { [Op.iLike]: pattern } },
      // Search by player name via literal (since it's in a joined table)
      literal(`"player"."first_name" ILIKE '${pattern.replace(/'/g, "''")}'`),
      literal(`"player"."last_name" ILIKE '${pattern.replace(/'/g, "''")}'`),
    ];
  }

  const { count, rows } = await Contract.findAndCountAll({
    where,
    include: CONTRACT_INCLUDES,
    limit,
    offset,
    order: [[sort, order]],
    distinct: true, // Needed when including associations to get correct count
  });

  const data = rows.map(enrichContract);
  return { data, meta: buildMeta(count, page, limit) };
}

// ────────────────────────────────────────────────────────────
// Get Contract by ID (with milestones)
// ────────────────────────────────────────────────────────────
export async function getContractById(id: string) {
  const contract = await Contract.findByPk(id, {
    include: CONTRACT_INCLUDES,
  });

  if (!contract) throw new AppError('Contract not found', 404);

  const enriched = enrichContract(contract);

  // Fetch milestones via raw SQL (until Milestone model is created)
  const milestones = await sequelize.query(
    `SELECT ms.*
     FROM milestones ms
     JOIN commission_schedules cs ON ms.commission_schedule_id = cs.id
     WHERE cs.contract_id = $1
     ORDER BY ms.due_date`,
    { bind: [id], type: QueryTypes.SELECT },
  );

  return { ...enriched, milestones };
}

// ────────────────────────────────────────────────────────────
// Create Contract
// ────────────────────────────────────────────────────────────
export async function createContract(input: CreateContractInput, createdBy: string) {
  // Auto-calculate total commission
  const totalCommission =
    input.commissionPct && input.baseSalary
      ? (input.baseSalary * input.commissionPct) / 100
      : 0;

  const contract = await Contract.create({
    playerId: input.playerId,
    clubId: input.clubId,
    category: input.category,
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    baseSalary: input.baseSalary,
    salaryCurrency: input.salaryCurrency,
    signingBonus: input.signingBonus,
    releaseClause: input.releaseClause,
    performanceBonus: input.performanceBonus,
    commissionPct: input.commissionPct,
    totalCommission,
    createdBy,
  });

  // Re-fetch with associations
  return getContractById(contract.id);
}

// ────────────────────────────────────────────────────────────
// Update Contract
// ────────────────────────────────────────────────────────────
export async function updateContract(id: string, input: UpdateContractInput) {
  const contract = await Contract.findByPk(id);
  if (!contract) throw new AppError('Contract not found', 404);

  // If commission % or salary changed, recalculate total
  const newPct = input.commissionPct ?? contract.commissionPct;
  const newSalary = input.baseSalary ?? contract.baseSalary;
  const updateData: any = { ...input };

  if (input.commissionPct !== undefined || input.baseSalary !== undefined) {
    updateData.totalCommission =
      newPct && newSalary ? (Number(newSalary) * Number(newPct)) / 100 : contract.totalCommission;
  }

  await contract.update(updateData);
  return getContractById(id);
}

// ────────────────────────────────────────────────────────────
// Delete Contract
// ────────────────────────────────────────────────────────────
export async function deleteContract(id: string) {
  const contract = await Contract.findByPk(id);
  if (!contract) throw new AppError('Contract not found', 404);

  await contract.destroy();
  return { id };
}