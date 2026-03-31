import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { transaction } from "@config/database";
import { Referral } from "@modules/referrals/referral.model";
import { Injury, InjuryUpdate } from "@modules/injuries/injury.model";
import { Ticket } from "@modules/tickets/ticket.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { buildMeta } from "@shared/utils/pagination";
import type {
  PlayerCareQuery,
  CreateCaseInput,
  CreateMedicalCaseInput,
} from "./playercare.schema";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "position",
  "photoUrl",
] as const;

const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

// ── List Cases (single JOIN query) ──

export async function listCases(query: PlayerCareQuery) {
  const { page, limit, category, status, playerId, search, sort, order } =
    query;
  const offset = (page - 1) * limit;

  const where: any = {};
  if (category) where.referralType = category;
  if (status) where.status = status;
  if (playerId) where.playerId = playerId;
  if (query.priority) where.priority = query.priority;
  if (query.assignedTo) where.assignedTo = query.assignedTo;

  if (search) {
    where[Op.or] = [
      { triggerDesc: { [Op.iLike]: `%${search}%` } },
      { outcome: { [Op.iLike]: `%${search}%` } },
      { notes: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Referral.findAndCountAll({
    where,
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      { model: User, as: "assignee", attributes: [...USER_ATTRS] },
      { model: User, as: "creator", attributes: [...USER_ATTRS] },
      {
        model: Injury,
        as: "injury",
        required: false,
        attributes: [
          "id",
          "injuryType",
          "injuryTypeAr",
          "bodyPart",
          "bodyPartAr",
          "severity",
          "cause",
          "status",
          "injuryDate",
          "expectedReturnDate",
          "actualReturnDate",
          "isSurgeryRequired",
          "surgeryDate",
        ],
      },
      {
        model: Ticket,
        as: "resultingTicket",
        required: false,
        attributes: [
          "id",
          "title",
          "titleAr",
          "status",
          "ticketType",
          "priority",
        ],
      },
    ],
    limit,
    offset,
    order: [[sort === "createdAt" ? "created_at" : sort, order]],
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Case by ID ──

export async function getCaseById(id: string) {
  const caseRecord = await Referral.findByPk(id, {
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      { model: User, as: "assignee", attributes: [...USER_ATTRS] },
      { model: User, as: "creator", attributes: [...USER_ATTRS] },
      {
        model: Injury,
        as: "injury",
        required: false,
        include: [
          {
            model: InjuryUpdate,
            as: "updates",
            separate: true,
            order: [["updateDate", "DESC"]],
          },
        ],
      },
      {
        model: Ticket,
        as: "resultingTicket",
        required: false,
        attributes: [
          "id",
          "title",
          "titleAr",
          "status",
          "ticketType",
          "priority",
        ],
      },
    ],
  });

  if (!caseRecord) throw new AppError("Case not found", 404);
  return caseRecord;
}

// ── Create Performance/Mental Case ──

export async function createCase(input: CreateCaseInput, createdBy: string) {
  const caseRecord = await Referral.create({
    referralType: input.caseType,
    playerId: input.playerId,
    triggerDesc: input.triggerDesc,
    status: "Open",
    priority: input.priority || "Medium",
    assignedTo: input.assignedTo,
    dueDate: input.dueDate,
    notes: input.notes,
    isRestricted: input.caseType === "Mental",
    restrictedTo: input.restrictedTo,
    resultingTicketId: input.resultingTicketId,
    createdBy,
  } as any);

  return getCaseById(caseRecord.id);
}

// ── Create Medical Case (injury + case in one transaction) ──

export async function createMedicalCase(
  input: CreateMedicalCaseInput,
  createdBy: string,
) {
  return transaction(async (t) => {
    // 1. Create the injury record
    const injury = await Injury.create(
      {
        playerId: input.playerId,
        matchId: input.matchId,
        injuryType: input.injuryType,
        injuryTypeAr: input.injuryTypeAr,
        bodyPart: input.bodyPart,
        bodyPartAr: input.bodyPartAr,
        severity: input.severity || "Moderate",
        cause: input.cause || "Unknown",
        status: "UnderTreatment",
        injuryDate: input.injuryDate,
        expectedReturnDate: input.expectedReturnDate,
        estimatedDaysOut: input.estimatedDaysOut,
        diagnosis: input.diagnosis,
        diagnosisAr: input.diagnosisAr,
        treatment: input.treatment,
        treatmentPlan: input.treatmentPlan,
        treatmentPlanAr: input.treatmentPlanAr,
        medicalProvider: input.medicalProvider,
        surgeonName: input.surgeonName,
        isSurgeryRequired: input.isSurgeryRequired || false,
        surgeryDate: input.surgeryDate,
        notes: input.injuryNotes,
        createdBy,
      } as any,
      { transaction: t },
    );

    // 2. Set player status to injured
    await Player.update(
      { status: "injured" },
      { where: { id: input.playerId }, transaction: t },
    );

    // 3. Create the linked case (referral)
    const SEVERITY_TO_PRIORITY: Record<string, string> = {
      Critical: "Critical",
      Severe: "High",
      Moderate: "Medium",
      Minor: "Low",
    };

    const caseRecord = await Referral.create(
      {
        referralType: "Medical",
        playerId: input.playerId,
        injuryId: injury.id,
        triggerDesc: `${input.injuryType} — ${input.bodyPart}`,
        isAutoGenerated: false,
        status: "Open",
        priority:
          SEVERITY_TO_PRIORITY[input.severity || "Moderate"] || "Medium",
        assignedTo: input.assignedTo,
        dueDate: input.dueDate,
        notes: input.notes,
        createdBy,
      } as any,
      { transaction: t },
    );

    return caseRecord.id;
  }).then((caseId) => getCaseById(caseId as string));
}

// ── Update Case ──

export async function updateCase(id: string, input: Record<string, unknown>) {
  const caseRecord = await Referral.findByPk(id);
  if (!caseRecord) throw new AppError("Case not found", 404);

  if (caseRecord.status === "Resolved") {
    throw new AppError("Cannot update a resolved case", 400);
  }

  await caseRecord.update(input);
  return getCaseById(id);
}

// ── Update Case Status (with bidirectional sync) ──

export async function updateCaseStatus(
  id: string,
  status: string,
  outcome?: string,
  notes?: string,
) {
  const caseRecord = await Referral.findByPk(id);
  if (!caseRecord) throw new AppError("Case not found", 404);

  const updateData: Record<string, unknown> = { status };
  if (outcome) updateData.outcome = outcome;
  if (notes) updateData.notes = notes;
  if (status === "Resolved") updateData.resolvedAt = new Date();

  await caseRecord.update(updateData);

  // Reverse sync: resolve linked injury when case is resolved
  if (status === "Resolved" && caseRecord.injuryId) {
    const injury = await Injury.findByPk(caseRecord.injuryId);
    if (injury && injury.status !== "Recovered") {
      await injury.update({
        status: "Recovered",
        actualReturnDate: new Date().toISOString().split("T")[0],
      } as any);

      // Check if player can be set back to active
      const activeCount = await Injury.count({
        where: {
          playerId: caseRecord.playerId,
          status: { [Op.in]: ["UnderTreatment", "Relapsed"] },
          id: { [Op.ne]: caseRecord.injuryId },
        },
      });
      if (activeCount === 0) {
        await Player.update(
          { status: "active" },
          { where: { id: caseRecord.playerId } },
        );
      }
    }
  }

  return getCaseById(id);
}

// ── Delete Case ──

export async function deleteCase(id: string) {
  const caseRecord = await Referral.findByPk(id);
  if (!caseRecord) throw new AppError("Case not found", 404);

  if (caseRecord.status === "Resolved") {
    throw new AppError("Cannot delete a resolved case", 400);
  }

  // If Medical with linked injury, delete the injury too
  if (caseRecord.injuryId) {
    await Injury.destroy({ where: { id: caseRecord.injuryId } });
  }

  await caseRecord.destroy();
}

// ── Player Timeline ──

export async function getPlayerTimeline(playerId: string) {
  const cases = await Referral.findAll({
    where: { playerId },
    include: [
      {
        model: Injury,
        as: "injury",
        required: false,
        attributes: [
          "id",
          "injuryType",
          "bodyPart",
          "severity",
          "status",
          "injuryDate",
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  return cases.map((c) => ({
    id: c.id,
    caseType: c.referralType,
    status: c.status,
    priority: c.priority,
    summary: c.triggerDesc || `${c.referralType} case`,
    assignedTo: c.assignedTo,
    date: c.createdAt.toISOString(),
    injury: (c as any).injury || null,
  }));
}

// ── Stats ──

export async function getCaseStats() {
  const [statusStats] = await Promise.all([
    sequelize.query<{ referral_type: string; status: string; count: string }>(
      `SELECT referral_type, status, COUNT(*)::int AS count
       FROM referrals
       GROUP BY referral_type, status
       ORDER BY referral_type, status`,
      { type: QueryTypes.SELECT },
    ),
  ]);

  const totalActive = statusStats
    .filter((r) => r.status !== "Resolved")
    .reduce((s, r) => s + Number(r.count), 0);

  const totalMedical = statusStats
    .filter((r) => r.referral_type === "Medical")
    .reduce((s, r) => s + Number(r.count), 0);

  return {
    byTypeAndStatus: statusStats,
    totalActive,
    totalMedical,
    total: statusStats.reduce((s, r) => s + Number(r.count), 0),
  };
}
