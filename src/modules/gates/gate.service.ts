import { Op } from "sequelize";
import {
  Gate,
  GateChecklist,
  type GateAttributes,
  type GateNumber,
  type GateStatus,
  type VerificationType,
} from "@modules/gates/gate.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { AppError } from "@middleware/errorHandler";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import { generateGateCompletedTask } from "@modules/gates/gateAutoTasks";
import { logger } from "@config/logger";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "photoUrl",
  "position",
] as const;
const USER_ATTRS = ["id", "fullName"] as const;
const CHECKLIST_ORDER: [string, string][] = [
  ["sortOrder", "ASC"],
  ["createdAt", "ASC"],
];

// ══════════════════════════════════════════
// DEFAULT CHECKLIST TEMPLATES
// ══════════════════════════════════════════

/**
 * Default checklist items auto-seeded when a gate is initialized.
 * Adjust items as needed for your agency's workflow.
 */
interface ChecklistTemplate {
  item: string;
  itemAr: string;
  isMandatory: boolean;
  sortOrder: number;
  verificationType: VerificationType;
  verificationRule: object | null;
}

export const GATE_CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate[]> = {
  "0": [
    {
      item: "Collect player identification documents (ID / Passport)",
      itemAr: "جمع وثائق هوية اللاعب (هوية / جواز سفر)",
      isMandatory: true,
      sortOrder: 0,
      verificationType: "auto",
      verificationRule: {
        check: "has_document",
        entityType: "Player",
        docType: ["ID", "Passport"],
        status: ["Active", "Valid"],
      },
    },
    {
      item: "Obtain signed representation agreement",
      itemAr: "الحصول على اتفاقية التمثيل الموقعة",
      isMandatory: true,
      sortOrder: 1,
      verificationType: "auto",
      verificationRule: {
        check: "has_contract",
        contractType: "Representation",
        requireSignature: true,
      },
    },
    {
      item: "Complete medical examination & fitness assessment",
      itemAr: "إكمال الفحص الطبي وتقييم اللياقة البدنية",
      isMandatory: true,
      sortOrder: 2,
      verificationType: "auto",
      verificationRule: {
        check: "has_document",
        entityType: "Player",
        docType: ["Medical"],
        status: ["Active", "Valid"],
      },
    },
    {
      item: "Verify player registration with federation",
      itemAr: "التحقق من تسجيل اللاعب لدى الاتحاد",
      isMandatory: true,
      sortOrder: 3,
      verificationType: "auto",
      verificationRule: {
        check: "player_field",
        field: "currentClubId",
        condition: "not_null",
      },
    },
    {
      item: "Upload player photo & profile data",
      itemAr: "رفع صورة اللاعب وبيانات الملف الشخصي",
      isMandatory: false,
      sortOrder: 4,
      verificationType: "auto",
      verificationRule: {
        check: "player_fields_filled",
        fields: ["photoUrl", "nationality", "position", "dateOfBirth"],
      },
    },
    {
      item: "Guardian consent form (if youth player)",
      itemAr: "نموذج موافقة ولي الأمر (إذا كان لاعب ناشئ)",
      isMandatory: false,
      sortOrder: 5,
      verificationType: "auto",
      verificationRule: {
        check: "conditional",
        condition: {
          check: "player_field",
          field: "playerType",
          value: "Youth",
        },
        then: {
          check: "player_fields_filled",
          fields: ["guardianName", "guardianPhone"],
        },
        else: "skip",
      },
    },
  ],
  "1": [
    {
      item: "Complete initial performance assessment",
      itemAr: "إكمال تقييم الأداء الأولي",
      isMandatory: true,
      sortOrder: 0,
      verificationType: "auto",
      verificationRule: {
        check: "player_fields_filled",
        fields: [
          "speed",
          "passing",
          "shooting",
          "defense",
          "fitness",
          "tactical",
        ],
      },
    },
    {
      item: "Create Individual Development Plan (IDP)",
      itemAr: "إنشاء خطة التطوير الفردية",
      isMandatory: true,
      sortOrder: 1,
      verificationType: "auto_with_override",
      verificationRule: {
        check: "has_note",
        ownerType: "Player",
        contentContains: "development plan",
      },
    },
    {
      item: "Set short-term performance goals",
      itemAr: "تحديد أهداف الأداء قصيرة المدى",
      isMandatory: true,
      sortOrder: 2,
      verificationType: "manual",
      verificationRule: null,
    },
    {
      item: "Assign development coach / mentor",
      itemAr: "تعيين مدرب تطوير / مرشد",
      isMandatory: false,
      sortOrder: 3,
      verificationType: "auto",
      verificationRule: {
        check: "player_field",
        field: "coachId",
        condition: "not_null",
      },
    },
    {
      item: "Record baseline statistics",
      itemAr: "تسجيل الإحصائيات الأساسية",
      isMandatory: false,
      sortOrder: 4,
      verificationType: "auto",
      verificationRule: { check: "has_scouting_stats" },
    },
  ],
  "2": [
    {
      item: "Mid-season performance review",
      itemAr: "مراجعة أداء منتصف الموسم",
      isMandatory: true,
      sortOrder: 0,
      verificationType: "auto_with_override",
      verificationRule: {
        check: "has_note",
        ownerType: "Player",
        afterGateStart: true,
      },
    },
    {
      item: "Update market valuation",
      itemAr: "تحديث التقييم السوقي",
      isMandatory: true,
      sortOrder: 1,
      verificationType: "auto",
      verificationRule: { check: "has_valuation", afterGateStart: true },
    },
    {
      item: "Review IDP progress & adjust goals",
      itemAr: "مراجعة تقدم خطة التطوير وتعديل الأهداف",
      isMandatory: true,
      sortOrder: 2,
      verificationType: "manual",
      verificationRule: null,
    },
    {
      item: "Collect performance data & match statistics",
      itemAr: "جمع بيانات الأداء وإحصائيات المباريات",
      isMandatory: false,
      sortOrder: 3,
      verificationType: "auto",
      verificationRule: { check: "player_stats_updated", afterGateStart: true },
    },
    {
      item: "Stakeholder feedback report",
      itemAr: "تقرير ملاحظات أصحاب المصلحة",
      isMandatory: false,
      sortOrder: 4,
      verificationType: "manual",
      verificationRule: null,
    },
  ],
  "3": [
    {
      item: "End-of-season comprehensive review",
      itemAr: "المراجعة الشاملة لنهاية الموسم",
      isMandatory: true,
      sortOrder: 0,
      verificationType: "auto_with_override",
      verificationRule: {
        check: "has_note",
        ownerType: "Player",
        afterGateStart: true,
      },
    },
    {
      item: "Contract renewal recommendation",
      itemAr: "توصية تجديد العقد",
      isMandatory: true,
      sortOrder: 1,
      verificationType: "auto_with_override",
      verificationRule: {
        check: "has_note",
        ownerType: "Player",
        contentContains: "renewal",
        afterGateStart: true,
      },
    },
    {
      item: "Final market valuation update",
      itemAr: "التحديث النهائي للتقييم السوقي",
      isMandatory: true,
      sortOrder: 2,
      verificationType: "auto",
      verificationRule: { check: "has_valuation", afterGateStart: true },
    },
    {
      item: "Transfer window strategy assessment",
      itemAr: "تقييم استراتيجية نافذة الانتقالات",
      isMandatory: false,
      sortOrder: 3,
      verificationType: "manual",
      verificationRule: null,
    },
    {
      item: "Player satisfaction interview",
      itemAr: "مقابلة رضا اللاعب",
      isMandatory: false,
      sortOrder: 4,
      verificationType: "manual",
      verificationRule: null,
    },
  ],
};

// ── Helpers ──

function gateIncludes() {
  return [
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    { model: User, as: "approver", attributes: [...USER_ATTRS] },
    {
      model: GateChecklist,
      as: "checklist",
      order: CHECKLIST_ORDER,
      separate: true,
    },
  ];
}

function computeProgress(checklist: GateChecklist[]): number {
  if (checklist.length === 0) return 0;
  const done = checklist.filter(
    (c) => c.isCompleted || (c.verificationType !== "manual" && c.autoVerified),
  ).length;
  return Math.round((done / checklist.length) * 100);
}

// ── List Gates ──

export async function listGates(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "gateNumber",
  );
  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.gateNumber) where.gateNumber = queryParams.gateNumber;
  if (queryParams.playerId) where.playerId = queryParams.playerId;

  if (search) {
    where[Op.or] = [
      { "$player.first_name$": { [Op.iLike]: `%${search}%` } },
      { "$player.last_name$": { [Op.iLike]: `%${search}%` } },
      { notes: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Gate.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order] as [string, string]],
    include: gateIncludes(),
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Gate by ID ──

export async function getGateById(id: string) {
  const gate = await Gate.findByPk(id, { include: gateIncludes() });
  if (!gate) throw new AppError("Gate not found", 404);

  const checklist = await GateChecklist.findAll({
    where: { gateId: id },
    order: [
      ["sortOrder", "ASC"],
      ["createdAt", "ASC"],
    ] as [string, string][],
  });

  return {
    ...gate.get({ plain: true }),
    progress: computeProgress(checklist),
  };
}

// ── Get All Gates for a Player (pipeline view) ──

export async function getPlayerGates(playerId: string) {
  const player = await Player.findByPk(playerId, {
    attributes: [...PLAYER_ATTRS],
  });
  if (!player) throw new AppError("Player not found", 404);

  const gates = await Gate.findAll({
    where: { playerId },
    order: [["gateNumber", "ASC"]] as [string, string][],
    include: [
      { model: User, as: "approver", attributes: [...USER_ATTRS] },
      {
        model: GateChecklist,
        as: "checklist",
        separate: true,
        order: [["sortOrder", "ASC"]] as [string, string][],
      },
    ],
  });

  const gatesWithProgress = gates.map((g) => {
    const plain = g.get({ plain: true }) as any;
    plain.progress = computeProgress(plain.checklist || []);
    return plain;
  });

  // Overall progress: average of all 4 gates (locked = 0%)
  const allGateNums: GateNumber[] = ["0", "1", "2", "3"];
  const gateMap = new Map(gatesWithProgress.map((g: any) => [g.gateNumber, g]));
  const overallProgress = Math.round(
    allGateNums.reduce((sum, num) => {
      const g = gateMap.get(num);
      return sum + (g ? g.progress : 0);
    }, 0) / 4,
  );

  return {
    player: player.get({ plain: true }),
    gates: gatesWithProgress,
    overallProgress,
  };
}

// ── Create Gate ──

export async function createGate(input: any) {
  await findOrThrow(Player, input.playerId, "Player");

  // Check duplicate
  const existing = await Gate.findOne({
    where: { playerId: input.playerId, gateNumber: input.gateNumber },
  });
  if (existing)
    throw new AppError(
      `Gate ${input.gateNumber} already exists for this player`,
      409,
    );

  // Gate ordering: can't create gate N if gate N-1 is not Completed (except gate 0)
  const gateNum = parseInt(input.gateNumber, 10);
  if (gateNum > 0) {
    const prevGate = await Gate.findOne({
      where: { playerId: input.playerId, gateNumber: String(gateNum - 1) },
    });
    if (!prevGate || prevGate.status !== "Completed") {
      throw new AppError(
        `Gate ${gateNum - 1} must be completed before creating Gate ${gateNum}`,
        400,
      );
    }
  }

  return await Gate.create(input);
}

// ── Initialize Gate (create + seed default checklist) ──

/**
 * Creates a gate for a player and seeds it with default checklist items.
 * Used by: admin manual creation UI and auto-trigger from scouting approval.
 */
export async function initializeGate(
  playerId: string,
  gateNumber: GateNumber,
  options: { autoStart?: boolean; notes?: string } = {},
) {
  // Reuse createGate for all validation (duplicate check, ordering)
  const gate = await createGate({
    playerId,
    gateNumber,
    status: options.autoStart ? "InProgress" : "Pending",
    notes: options.notes,
  });

  // If auto-started, record startedAt
  if (options.autoStart) {
    await gate.update({ startedAt: new Date() });
  }

  // Seed default checklist items from template
  const template = GATE_CHECKLIST_TEMPLATES[gateNumber] || [];
  if (template.length > 0) {
    await GateChecklist.bulkCreate(
      template.map((t) => ({
        gateId: gate.id,
        item: t.item,
        itemAr: t.itemAr,
        isMandatory: t.isMandatory,
        sortOrder: t.sortOrder,
        verificationType: t.verificationType,
        verificationRule: t.verificationRule,
      })),
    );
  }

  // Return full gate with checklist included
  return getGateById(gate.id);
}

// ── Advance Gate (start / complete) ──

export async function advanceGate(
  id: string,
  action: "start" | "complete",
  userId: string,
  notes?: string,
) {
  const gate = await Gate.findByPk(id, {
    include: [{ model: GateChecklist, as: "checklist" }],
  });
  if (!gate) throw new AppError("Gate not found", 404);

  if (action === "start") {
    if (gate.status !== "Pending")
      throw new AppError("Gate can only be started from Pending status", 400);
    return await gate.update({
      status: "InProgress" as GateStatus,
      startedAt: new Date(),
      notes: notes || gate.notes,
    });
  }

  if (action === "complete") {
    if (gate.status !== "InProgress")
      throw new AppError("Gate must be InProgress to complete", 400);

    // Check all mandatory items are satisfied (completed manually OR auto-verified)
    const checklist = (gate as any).checklist || [];
    const mandatoryUnsatisfied = checklist.filter(
      (c: GateChecklist) =>
        c.isMandatory &&
        !c.isCompleted &&
        !(c.verificationType !== "manual" && c.autoVerified),
    );
    if (mandatoryUnsatisfied.length > 0) {
      throw new AppError(
        `Cannot complete gate: ${mandatoryUnsatisfied.length} mandatory checklist item(s) are not satisfied`,
        400,
      );
    }

    await gate.update({
      status: "Completed" as GateStatus,
      completedAt: new Date(),
      approvedBy: userId,
      notes: notes || gate.notes,
    });

    // Auto-initialize next gate if it doesn't exist yet
    const nextGateNum = String(parseInt(gate.gateNumber, 10) + 1);
    if (["1", "2", "3"].includes(nextGateNum)) {
      const existing = await Gate.findOne({
        where: { playerId: gate.playerId, gateNumber: nextGateNum },
      });
      if (!existing) {
        await initializeGate(gate.playerId, nextGateNum as GateNumber, {
          autoStart: true,
        });
      }
    }

    // Auto-task: gate completed → Manager (fire-and-forget)
    generateGateCompletedTask(gate.id, userId).catch((err) =>
      logger.warn("Auto-task gate_completed_next failed", {
        error: (err as Error).message,
      }),
    );

    return gate;
  }

  throw new AppError("Invalid action", 400);
}

// ── Update Gate ──

export async function updateGate(id: string, input: any) {
  const gate = await findOrThrow(Gate, id, "Gate");

  if (gate.status === "Completed") {
    throw new AppError("Cannot modify a completed gate", 400);
  }

  // Cast status safely
  if (input.status) input.status = input.status as GateAttributes["status"];

  return await gate.update(input);
}

// ── Delete Gate ──

export async function deleteGate(id: string) {
  const gate = await findOrThrow(Gate, id, "Gate");

  if (gate.status === "Completed") {
    throw new AppError("Cannot delete a completed gate", 400);
  }

  await gate.destroy();
  return { id };
}

// ══════════════════════════════════════════
// CHECKLIST OPERATIONS
// ══════════════════════════════════════════

// ── Add Checklist Item ──

export async function addChecklistItem(gateId: string, input: any) {
  const gate = await findOrThrow(Gate, gateId, "Gate");
  if (gate.status === "Completed")
    throw new AppError("Cannot modify checklist of a completed gate", 400);

  return await GateChecklist.create({ ...input, gateId });
}

// ── Toggle Checklist Item ──

/**
 * Override-allowed roles for auto-verified items.
 * Only Admin and Manager (General Manager) can manually override auto checks.
 */
const OVERRIDE_ROLES = ["Admin", "Manager"];

export async function toggleChecklistItem(
  itemId: string,
  input: any,
  userId: string,
  userRole: string,
) {
  const item = await findOrThrow(GateChecklist, itemId, "Checklist item");

  // Verify parent gate is not completed
  const gate = await Gate.findByPk(item.gateId);
  if (gate?.status === "Completed")
    throw new AppError("Cannot modify checklist of a completed gate", 400);

  // Override policy: auto items can only be manually toggled by Admin/Manager
  if (
    item.verificationType === "auto" &&
    input.isCompleted &&
    !item.autoVerified
  ) {
    if (!OVERRIDE_ROLES.includes(userRole)) {
      throw new AppError(
        "Only Admin or Manager can override auto-verified items",
        403,
      );
    }
  }

  const updateData: any = { isCompleted: input.isCompleted };
  if (input.isCompleted) {
    updateData.completedAt = new Date();
    updateData.completedBy = userId;

    // Track override for auto items that aren't auto-verified
    if (item.verificationType !== "manual" && !item.autoVerified) {
      updateData.overriddenBy = userId;
      updateData.overriddenAt = new Date();
    }
  } else {
    updateData.completedAt = null;
    updateData.completedBy = null;
    updateData.overriddenBy = null;
    updateData.overriddenAt = null;
  }
  if (input.evidenceUrl !== undefined)
    updateData.evidenceUrl = input.evidenceUrl;
  if (input.notes !== undefined) updateData.notes = input.notes;

  await item.update(updateData);

  return item;
}

// ── Delete Checklist Item ──

export async function deleteChecklistItem(itemId: string) {
  const item = await findOrThrow(GateChecklist, itemId, "Checklist item");

  const gate = await Gate.findByPk(item.gateId);
  if (gate?.status === "Completed")
    throw new AppError("Cannot modify checklist of a completed gate", 400);

  await item.destroy();
  return { id: itemId };
}
