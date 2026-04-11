import { RtpProtocol, RtpPhaseLog, RTP_PHASES } from "./rtp.model";
import { Injury } from "@modules/injuries/injury.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateRtpProtocolInput,
  UpdateRtpProtocolInput,
  AdvancePhaseInput,
  RtpQuery,
} from "./rtp.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "photoUrl",
] as const;
const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

function protocolIncludes() {
  return [
    {
      model: Injury,
      as: "injury",
      attributes: ["id", "injuryType", "bodyPart", "status", "injuryDate"],
    },
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    { model: User, as: "creator", attributes: [...USER_ATTRS] },
    {
      model: RtpPhaseLog,
      as: "phaseLogs",
      separate: true,
      order: [["entered_date", "ASC"]] as [string, string][],
      include: [
        { model: User, as: "clearingUser", attributes: [...USER_ATTRS] },
      ],
    },
  ];
}

// ── List ──

export async function listRtpProtocols(query: RtpQuery) {
  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.injuryId) where.injuryId = query.injuryId;
  if (query.status) where.status = query.status;

  const offset = (query.page - 1) * query.limit;

  const { rows, count } = await RtpProtocol.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: query.limit,
    offset,
    include: protocolIncludes(),
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

export async function getRtpProtocolById(id: string) {
  const protocol = await RtpProtocol.findByPk(id, {
    include: protocolIncludes(),
  });
  if (!protocol) throw new AppError("RTP protocol not found", 404);
  return protocol;
}

// ── Get by Injury ID ──

export async function getRtpProtocolByInjury(injuryId: string) {
  const protocol = await RtpProtocol.findOne({
    where: { injuryId },
    include: protocolIncludes(),
  });
  return protocol;
}

// ── Create ──

export async function createRtpProtocol(
  body: CreateRtpProtocolInput,
  userId: string,
) {
  // One protocol per injury
  const existing = await RtpProtocol.findOne({
    where: { injuryId: body.injuryId },
  });
  if (existing) {
    throw new AppError(
      "An RTP protocol already exists for this injury. Update the existing one instead.",
      409,
    );
  }

  const protocol = await RtpProtocol.create({
    ...body,
    currentPhase: "rest",
    status: "active",
    createdBy: userId,
  });

  // Record initial phase log
  await RtpPhaseLog.create({
    protocolId: protocol.id,
    phase: "rest",
    enteredDate: body.startDate,
    medicalClearance: false,
  });

  return getRtpProtocolById(protocol.id);
}

// ── Update ──

export async function updateRtpProtocol(
  id: string,
  body: UpdateRtpProtocolInput,
) {
  const protocol = await RtpProtocol.findByPk(id);
  if (!protocol) throw new AppError("RTP protocol not found", 404);

  await protocol.update(body);
  return getRtpProtocolById(id);
}

// ── Delete ──

export async function deleteRtpProtocol(id: string) {
  const protocol = await RtpProtocol.findByPk(id);
  if (!protocol) throw new AppError("RTP protocol not found", 404);
  await protocol.destroy();
  return { id };
}

// ── Advance Phase ──

export async function advancePhase(
  protocolId: string,
  clearedBy: string,
  body: AdvancePhaseInput,
) {
  const protocol = await RtpProtocol.findByPk(protocolId, {
    include: [
      {
        model: RtpPhaseLog,
        as: "phaseLogs",
        separate: true,
        order: [["entered_date", "ASC"]] as [string, string][],
      },
    ],
  });
  if (!protocol) throw new AppError("RTP protocol not found", 404);
  if (protocol.status !== "active") {
    throw new AppError("Cannot advance a non-active RTP protocol", 422);
  }

  const currentIndex = RTP_PHASES.indexOf(protocol.currentPhase);
  if (currentIndex === RTP_PHASES.length - 1) {
    throw new AppError("Player is already at the final phase (returned)", 422);
  }

  const nextPhase = RTP_PHASES[currentIndex + 1];
  const today = new Date().toISOString().slice(0, 10);

  // Close current phase log (find the open one for current phase)
  const openLog = await RtpPhaseLog.findOne({
    where: { protocolId, phase: protocol.currentPhase, exitedDate: null },
    order: [["created_at", "DESC"]],
  });
  if (openLog) {
    await openLog.update({
      exitedDate: body.exitedDate || today,
      clearedBy,
      painLevel: body.painLevel ?? null,
      fitnessTestPassed: body.fitnessTestPassed ?? null,
      medicalClearance: body.medicalClearance ?? false,
      notes: body.notes ?? null,
      notesAr: body.notesAr ?? null,
    });
  }

  // Create new phase log
  await RtpPhaseLog.create({
    protocolId,
    phase: nextPhase,
    enteredDate: body.exitedDate || today,
    medicalClearance: false,
  });

  // Update protocol current phase
  const updates: Partial<{
    currentPhase: typeof nextPhase;
    status: "completed";
    actualReturnDate: string;
  }> = {
    currentPhase: nextPhase,
  };

  // Auto-complete if reached "returned"
  if (nextPhase === "returned") {
    updates.status = "completed";
    updates.actualReturnDate = body.exitedDate || today;
  }

  await protocol.update(updates);
  return getRtpProtocolById(protocolId);
}
