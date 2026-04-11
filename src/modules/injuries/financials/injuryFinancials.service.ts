import { Op } from "sequelize";
import { InjuryFinancials } from "./injuryFinancials.model";
import { Injury } from "@modules/injuries/injury.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { Contract } from "@modules/contracts/contract.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateInjuryFinancialsInput,
  UpdateInjuryFinancialsInput,
  InjuryFinancialsQuery,
} from "./injuryFinancials.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "photoUrl",
] as const;
const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

function financialsIncludes() {
  return [
    {
      model: Injury,
      as: "injury",
      attributes: [
        "id",
        "injuryType",
        "bodyPart",
        "status",
        "injuryDate",
        "actualReturnDate",
        "daysOut",
        "actualDaysOut",
      ],
    },
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    { model: User, as: "creator", attributes: [...USER_ATTRS] },
  ];
}

function computeTotals(
  data: Partial<{
    monthlySalaryQar: number | null;
    daysOut: number | null;
    treatmentCostQar: number | null;
    estimatedMatchRevenueQar: number | null;
    insuranceCovered: boolean;
    insuranceAmountQar: number | null;
  }>,
) {
  const monthly = Number(data.monthlySalaryQar ?? 0);
  const days = Number(data.daysOut ?? 0);
  const dailyCost = monthly > 0 ? parseFloat((monthly / 30).toFixed(2)) : 0;
  const salaryCost = parseFloat((dailyCost * days).toFixed(2));
  const treatment = Number(data.treatmentCostQar ?? 0);
  const revenue = Number(data.estimatedMatchRevenueQar ?? 0);
  const insurance = data.insuranceCovered
    ? Number(data.insuranceAmountQar ?? 0)
    : 0;
  const total = parseFloat(
    (salaryCost + treatment + revenue - insurance).toFixed(2),
  );

  return { dailyCost, salaryCost, total };
}

// ── List ──

export async function listInjuryFinancials(query: InjuryFinancialsQuery) {
  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.injuryId) where.injuryId = query.injuryId;

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await InjuryFinancials.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: query.limit,
    offset,
    include: financialsIncludes(),
    distinct: true,
  });

  return {
    data: rows,
    meta: {
      total: count,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(count / query.limit),
    },
  };
}

// ── Get by ID ──

export async function getInjuryFinancialsById(id: string) {
  const record = await InjuryFinancials.findByPk(id, {
    include: financialsIncludes(),
  });
  if (!record) throw new AppError("Injury financials record not found", 404);
  return record;
}

// ── Get by Injury ID ──

export async function getInjuryFinancialsByInjury(injuryId: string) {
  return InjuryFinancials.findOne({
    where: { injuryId },
    include: financialsIncludes(),
  });
}

// ── Create ──

export async function createInjuryFinancials(
  body: CreateInjuryFinancialsInput,
  userId: string,
) {
  const existing = await InjuryFinancials.findOne({
    where: { injuryId: body.injuryId },
  });
  if (existing) {
    throw new AppError(
      "Financial impact record already exists for this injury. Use update instead.",
      409,
    );
  }

  const record = await InjuryFinancials.create({
    ...body,
    createdBy: userId,
    calculatedAt: new Date(),
  });
  return getInjuryFinancialsById(record.id);
}

// ── Update ──

export async function updateInjuryFinancials(
  id: string,
  body: UpdateInjuryFinancialsInput,
) {
  const record = await InjuryFinancials.findByPk(id);
  if (!record) throw new AppError("Injury financials record not found", 404);
  await record.update({ ...body, calculatedAt: new Date() });
  return getInjuryFinancialsById(id);
}

// ── Delete ──

export async function deleteInjuryFinancials(id: string) {
  const record = await InjuryFinancials.findByPk(id);
  if (!record) throw new AppError("Injury financials record not found", 404);
  await record.destroy();
  return { id };
}

// ── Compute & upsert from injury data ──

export async function computeFinancialImpact(injuryId: string, userId: string) {
  const injury = await Injury.findByPk(injuryId);
  if (!injury) throw new AppError("Injury not found", 404);

  // Try to pull salary from the player's active contract
  let monthlySalaryQar: number | null = null;
  const activeContract = await Contract.findOne({
    where: {
      playerId: injury.playerId,
      status: { [Op.in]: ["Active", "active"] },
    },
    order: [["startDate", "DESC"]],
    attributes: ["baseSalary", "salaryCurrency"],
  });

  if (activeContract?.baseSalary) {
    // baseSalary is stored as annual in SAR — convert to monthly QAR (≈1 SAR = 1.03 QAR)
    const annual = Number(activeContract.baseSalary);
    const monthly = parseFloat((annual / 12).toFixed(2));
    // Simple peg: QAR ≈ SAR for business purposes (both pegged to USD)
    monthlySalaryQar = monthly;
  }

  const daysOut =
    injury.actualDaysOut ?? injury.daysOut ?? injury.estimatedDaysOut ?? 0;
  const { dailyCost, salaryCost } = computeTotals({
    monthlySalaryQar,
    daysOut,
  });

  const existing = await InjuryFinancials.findOne({ where: { injuryId } });

  if (existing) {
    const updates: Record<string, unknown> = { calculatedAt: new Date() };
    if (monthlySalaryQar !== null) {
      updates.monthlySalaryQar = monthlySalaryQar;
      updates.dailySalaryCost = dailyCost;
      updates.totalSalaryCostQar = salaryCost;
    }
    // Recompute total
    const gross =
      salaryCost +
      Number(existing.treatmentCostQar ?? 0) +
      Number(existing.estimatedMatchRevenueQar ?? 0);
    const net = existing.insuranceCovered
      ? parseFloat(
          (gross - Number(existing.insuranceAmountQar ?? 0)).toFixed(2),
        )
      : gross;
    updates.totalFinancialImpactQar = net;
    await existing.update(updates);
    return getInjuryFinancialsById(existing.id);
  }

  // Create fresh record
  const gross = salaryCost;
  const record = await InjuryFinancials.create({
    injuryId,
    playerId: injury.playerId,
    monthlySalaryQar,
    dailySalaryCost: dailyCost,
    totalSalaryCostQar: salaryCost,
    missedMatchesCount: 0,
    insuranceCovered: false,
    totalFinancialImpactQar: gross,
    currency: "QAR",
    calculatedAt: new Date(),
    createdBy: userId,
  });

  return getInjuryFinancialsById(record.id);
}
