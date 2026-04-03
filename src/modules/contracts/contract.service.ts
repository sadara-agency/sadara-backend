import {
  Op,
  Sequelize,
  QueryTypes,
  fn,
  col,
  where as seqWhere,
} from "sequelize";
import { Contract } from "@modules/contracts/contract.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AuditLog } from "@modules/audit/AuditLog.model";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import {
  CreateContractInput,
  UpdateContractInput,
} from "@modules/contracts/contract.validation";
import { generateContractCreationTask } from "@modules/contracts/contractAutoTasks";
import { isApprovalChainResolved } from "@modules/approvals/approval.service";
import { logger } from "@config/logger";
import { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";

// ── Shared includes for player + club ──
const CONTRACT_INCLUDES = [
  {
    model: Player,
    as: "player",
    attributes: [
      "id",
      "firstName",
      "lastName",
      "firstNameAr",
      "lastNameAr",
      "nationality",
      "nationalId",
      "phone",
      "photoUrl",
    ],
  },
  {
    model: Club,
    as: "club",
    attributes: ["id", "name", "nameAr", "logoUrl"],
  },
  {
    model: User,
    as: "creator",
    attributes: ["id", "fullName", "fullNameAr"],
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
export async function listContracts(queryParams: any, user?: AuthUser) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );

  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.category) where.category = queryParams.category;
  if (queryParams.playerContractType)
    where.playerContractType = queryParams.playerContractType;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.clubId) where.clubId = queryParams.clubId;

  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { title: { [Op.iLike]: pattern } },
      seqWhere(fn("lower", col("player.first_name")), {
        [Op.like]: pattern.toLowerCase(),
      }),
      seqWhere(fn("lower", col("player.last_name")), {
        [Op.like]: pattern.toLowerCase(),
      }),
    ];
  }

  // Row-level scoping
  const scope = buildRowScope("contracts", user);
  if (scope) mergeScope(where, scope);

  const { count, rows } = await Contract.findAndCountAll({
    where,
    include: CONTRACT_INCLUDES,
    limit,
    offset,
    order: [[sort, order]],
    distinct: true,
    subQuery: false,
  });

  const data = rows.map(enrichContract);
  return { data, meta: buildMeta(count, page, limit) };
}

// ────────────────────────────────────────────────────────────
// Get Contract by ID (with milestones)
// ────────────────────────────────────────────────────────────
export async function getContractById(id: string, user?: AuthUser) {
  const contract = await Contract.findByPk(id, {
    include: CONTRACT_INCLUDES,
  });

  if (!contract) throw new AppError("Contract not found", 404);

  // Row-level access check
  const hasAccess = await checkRowAccess("contracts", contract, user);
  if (!hasAccess) throw new AppError("Contract not found", 404);

  const enriched = enrichContract(contract);

  let milestones: any[] = [];
  try {
    milestones = await sequelize.query(
      `SELECT ms.*
       FROM milestones ms
       JOIN commission_schedules cs ON ms.commission_schedule_id = cs.id
       WHERE cs.contract_id = $1
       ORDER BY ms.due_date`,
      { bind: [id], type: QueryTypes.SELECT },
    );
  } catch {
    // milestones/commission_schedules tables may not exist yet
  }

  // Include approval chain status for UI visibility decisions
  const approvalChain = await isApprovalChainResolved("contract", id);

  return { ...enriched, milestones, approvalStatus: approvalChain.status };
}

// ────────────────────────────────────────────────────────────
// Create Contract
// ────────────────────────────────────────────────────────────
export async function createContract(
  input: CreateContractInput,
  createdBy: string,
) {
  const totalCommission =
    input.commissionPct && input.baseSalary
      ? (input.baseSalary * input.commissionPct) / 100
      : 0;

  // Auto-fill playerContractType from player profile if not provided
  let playerContractType = (input as any).playerContractType || null;
  if (!playerContractType) {
    const player = await Player.findByPk(input.playerId, {
      attributes: ["contractType"],
    });
    if (player) playerContractType = (player as any).contractType || null;
  }

  // Overlap check + creation in a transaction to prevent race conditions
  const contract = await sequelize.transaction(async (t) => {
    const overlap = await Contract.findOne({
      where: {
        playerId: input.playerId,
        status: { [Op.in]: ["Active", "Expiring Soon"] },
        startDate: { [Op.lte]: input.endDate },
        endDate: { [Op.gte]: input.startDate },
      },
      transaction: t,
    });
    if (overlap) {
      throw new AppError(
        "This player already has an active contract with overlapping dates. Terminate or adjust the existing contract first.",
        409,
      );
    }

    return await Contract.create(
      {
        playerId: input.playerId,
        clubId: input.clubId,
        category: input.category,
        contractType: (input as any).contractType,
        playerContractType,
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
        exclusivity: input.exclusivity,
        representationScope: input.representationScope,
        agentName: input.agentName,
        agentLicense: input.agentLicense,
        notes: input.notes,
        createdBy,
      },
      { transaction: t },
    );
  });

  // Fire-and-forget: auto-create legal review task
  generateContractCreationTask(contract.id, createdBy).catch((err) =>
    logger.warn("Contract auto-task generation failed", {
      contractId: contract.id,
      error: (err as Error).message,
    }),
  );

  return getContractById(contract.id);
}

// ────────────────────────────────────────────────────────────
// Update Contract
// ────────────────────────────────────────────────────────────
export async function updateContract(id: string, input: UpdateContractInput) {
  const contract = await findOrThrow(Contract, id, "Contract");

  // Prevent commission changes on locked contracts (signed/terminated)
  if (
    contract.commissionLocked &&
    (input.commissionPct !== undefined || input.baseSalary !== undefined)
  ) {
    throw new AppError(
      "Commission fields cannot be modified after the contract has been signed",
      400,
    );
  }

  const newPct = input.commissionPct ?? contract.commissionPct;
  const newSalary = input.baseSalary ?? contract.baseSalary;
  const updateData: any = { ...input };

  if (input.commissionPct !== undefined || input.baseSalary !== undefined) {
    updateData.totalCommission =
      newPct && newSalary
        ? (Number(newSalary) * Number(newPct)) / 100
        : contract.totalCommission;
  }

  await contract.update(updateData);
  return getContractById(id);
}

// ────────────────────────────────────────────────────────────
// Delete Contract
// ────────────────────────────────────────────────────────────
export async function deleteContract(id: string) {
  const contract = await findOrThrow(Contract, id, "Contract");

  // Prevent deletion of active/signed contracts
  if (["Active", "Expiring Soon"].includes(contract.status)) {
    throw new AppError(
      "Cannot delete an active contract. Use termination instead.",
      400,
    );
  }

  try {
    await contract.destroy();
  } catch (err: any) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      throw new AppError(
        "Cannot delete contract — it has linked records (payments, documents, etc.)",
        409,
      );
    }
    throw err;
  }
  return { id };
}

// ────────────────────────────────────────────────────────────
// Terminate Contract (NEW)
// ────────────────────────────────────────────────────────────
export interface TerminateContractInput {
  reason: string;
  terminationDate?: string;
  terminationType?: "mutual" | "unilateral";
  hasOutstanding?: boolean;
  outstandingAmount?: number;
  outstandingCurrency?: string;
  outstandingDetails?: string;
}

export async function terminateContract(
  id: string,
  input: TerminateContractInput,
  terminatedBy: string,
) {
  const contract = await findOrThrow(Contract, id, "Contract");

  // Only active/expiring contracts can be terminated
  const terminatable = ["Active", "Expiring Soon", "AwaitingPlayer", "Signing"];
  if (!terminatable.includes(contract.status)) {
    throw new AppError(
      `Cannot terminate a contract in '${contract.status}' status. Only ${terminatable.join(", ")} contracts can be terminated.`,
      400,
    );
  }

  const termDate =
    input.terminationDate || new Date().toISOString().split("T")[0];

  // Validate termination date falls within contract period
  if (new Date(termDate) < new Date(contract.startDate)) {
    throw new AppError(
      "Termination date cannot be before contract start date",
      400,
    );
  }
  if (contract.endDate && new Date(termDate) > new Date(contract.endDate)) {
    throw new AppError(
      "Termination date cannot be after contract end date",
      400,
    );
  }

  // Set termination fields
  const existing = contract.notes || "";
  const timestamp = new Date().toISOString().split("T")[0];
  const terminationNote = `[${timestamp}] TERMINATED: ${input.reason}`;

  const updatePayload: Record<string, unknown> = {
    status: "Terminated",
    terminationDate: termDate,
    terminationReason: input.reason,
    terminationType: input.terminationType ?? "mutual",
    notes: existing ? `${existing}\n${terminationNote}` : terminationNote,
    endDate: termDate,
    commissionLocked: true,
  };

  if (input.hasOutstanding) {
    updatePayload.hasOutstanding = true;
    updatePayload.outstandingAmount = input.outstandingAmount ?? 0;
    updatePayload.outstandingCurrency = input.outstandingCurrency ?? "SAR";
    updatePayload.outstandingDetails = input.outstandingDetails ?? null;
  }

  await contract.update(updatePayload);

  return getContractById(id);
}

// ────────────────────────────────────────────────────────────
// Contract History (from audit logs)
// ────────────────────────────────────────────────────────────
export async function getContractHistory(contractId: string) {
  const rows = await AuditLog.findAll({
    where: { entity: "contracts", entityId: contractId },
    order: [["loggedAt", "DESC"]],
    attributes: [
      "id",
      "action",
      "userName",
      "userRole",
      "detail",
      "changes",
      "loggedAt",
    ],
  });
  return rows;
}
