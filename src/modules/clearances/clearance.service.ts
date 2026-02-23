// ─────────────────────────────────────────────────────────────
// src/modules/clearances/clearance.service.ts
// Business logic for clearance (مخالصة) operations.
// ─────────────────────────────────────────────────────────────
import { Op } from 'sequelize';
import { Clearance } from './clearance.model';
import { Contract } from '../contracts/contract.model';
import { Player } from '../players/player.model';
import { User } from '../Users/user.model';
import { AppError } from '../../middleware/errorHandler';

// ── Associations ──


const INCLUDE_RELATIONS = [
  {
    model: Contract,
    as: 'contract',
    attributes: ['id', 'title', 'startDate', 'endDate', 'status', 'commissionPct'],
    include: [
      { model: Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl'] },
    ],
  },
  { model: Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl'] },
  { model: User, as: 'creator', attributes: ['id', 'fullName', 'fullNameAr'] },
];

// ── List clearances ──
export async function listClearances(query: any) {
  const { page = 1, limit = 20, status, contractId, playerId } = query;
  const where: any = {};
  if (status) where.status = status;
  if (contractId) where.contractId = contractId;
  if (playerId) where.playerId = playerId;

  const { rows, count } = await Clearance.findAndCountAll({
    where,
    include: INCLUDE_RELATIONS,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    clearances: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
}

// ── Get single clearance ──
export async function getClearanceById(id: string) {
  return Clearance.findByPk(id, { include: INCLUDE_RELATIONS });
}

// ── Create clearance ──
export async function createClearance(data: any, userId: string) {
  // Validate contract exists and is active
  const contract = await Contract.findByPk(data.contractId);
  if (!contract) throw new AppError('Contract not found', 404);

  // Check contract is in a terminable state
  const terminableStatuses = ['Active', 'Expiring Soon', 'Review', 'Signing'];
  if (!terminableStatuses.includes(contract.status)) {
    throw new AppError(`Cannot create clearance for contract with status "${contract.status}"`, 400);
  }

  // Check no existing active clearance for this contract
  const existing = await Clearance.findOne({
    where: { contractId: data.contractId, status: 'Processing' },
  });
  if (existing) {
    throw new AppError('An active clearance already exists for this contract', 400);
  }

  const clearance = await Clearance.create({
    ...data,
    playerId: contract.playerId,
    createdBy: userId,
  });

  return getClearanceById(clearance.id);
}

// ── Update clearance ──
export async function updateClearance(id: string, data: any) {
  const clearance = await Clearance.findByPk(id);
  if (!clearance) throw new AppError('Clearance not found', 404);
  if (clearance.status === 'Completed') {
    throw new AppError('Cannot update a completed clearance', 400);
  }

  await clearance.update(data);
  return getClearanceById(id);
}

// ── Complete clearance (sign + terminate contract) ──
export async function completeClearance(id: string, data: any) {
  const clearance = await Clearance.findByPk(id);
  if (!clearance) throw new AppError('Clearance not found', 404);
  if (clearance.status === 'Completed') {
    throw new AppError('Clearance is already completed', 400);
  }

  // Must have no-claims declaration
  if (!clearance.noClaimsDeclaration) {
    throw new AppError('No-claims declaration must be accepted before completing', 400);
  }

  const updateData: any = {
    status: 'Completed',
    signedAt: new Date(),
  };

  if (data.action === 'sign_digital') {
    updateData.signedDocumentUrl = data.signatureData;
    updateData.signingMethod = 'digital';
  } else if (data.action === 'sign_upload') {
    updateData.signedDocumentUrl = data.signedDocumentUrl;
    updateData.signingMethod = 'upload';
  }

  await clearance.update(updateData);

  // ── Auto-terminate the parent contract ──
  await Contract.update(
    {
      status: 'Terminated' as any,
      terminatedByClearanceId: clearance.id,
    } as any,
    { where: { id: clearance.contractId } },
  );

  return getClearanceById(id);
}

// ── Delete clearance (only if Processing) ──
export async function deleteClearance(id: string) {
  const clearance = await Clearance.findByPk(id);
  if (!clearance) throw new AppError('Clearance not found', 404);
  if (clearance.status === 'Completed') {
    throw new AppError('Cannot delete a completed clearance', 400);
  }
  await clearance.destroy();
}

// ── Get clearances for a contract ──
export async function getClearancesByContract(contractId: string) {
  return Clearance.findAll({
    where: { contractId },
    include: INCLUDE_RELATIONS,
    order: [['createdAt', 'DESC']],
  });
}