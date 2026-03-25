import { Op } from "sequelize";
import { AppError } from "@middleware/errorHandler";
import { Gate, GateChecklist } from "@modules/gates/gate.model";
import { Player } from "@modules/players/player.model";
import { Document } from "@modules/documents/document.model";
import { Contract } from "@modules/contracts/contract.model";
import { Note } from "@modules/notes/note.model";
import { Valuation } from "@modules/finance/finance.model";
import { ScreeningCase, Watchlist } from "@modules/scouting/scouting.model";

// ══════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════

export interface VerificationResult {
  itemId: string;
  verified: boolean;
  reason: string;
  reasonAr: string;
  details?: Record<string, any>;
}

export interface GateVerificationResult {
  gateId: string;
  items: VerificationResult[];
  allMandatoryVerified: boolean;
}

interface CheckerContext {
  playerId: string;
  gateStartedAt: Date | null;
}

// ══════════════════════════════════════════
// CHECKER REGISTRY
// ══════════════════════════════════════════

type CheckerFn = (
  ctx: CheckerContext,
  rule: any,
) => Promise<{
  verified: boolean;
  reason: string;
  reasonAr: string;
  details?: Record<string, any>;
}>;

const checkers: Record<string, CheckerFn> = {
  has_document: checkHasDocument,
  has_contract: checkHasContract,
  player_field: checkPlayerField,
  player_fields_filled: checkPlayerFieldsFilled,
  has_note: checkHasNote,
  has_valuation: checkHasValuation,
  has_scouting_stats: checkHasScoutingStats,
  player_stats_updated: checkPlayerStatsUpdated,
  conditional: checkConditional,
  manual: async () => ({
    verified: false,
    reason: "Manual verification required",
    reasonAr: "يتطلب تحقق يدوي",
  }),
};

// ══════════════════════════════════════════
// MAIN FUNCTIONS
// ══════════════════════════════════════════

/**
 * Verify all auto-check items for a gate.
 * Updates DB records with results and returns the verification status.
 */
export async function verifyGate(
  gateId: string,
): Promise<GateVerificationResult> {
  const gate = await Gate.findByPk(gateId);
  if (!gate) throw new AppError("Gate not found", 404);

  const items = await GateChecklist.findAll({
    where: { gateId },
    order: [["sortOrder", "ASC"]],
  });

  const ctx: CheckerContext = {
    playerId: gate.playerId,
    gateStartedAt: gate.startedAt,
  };

  const results: VerificationResult[] = [];

  for (const item of items) {
    if (item.verificationType === "manual") {
      results.push({
        itemId: item.id,
        verified: item.isCompleted,
        reason: item.isCompleted
          ? "Manually completed"
          : "Awaiting manual check",
        reasonAr: item.isCompleted
          ? "تم إكماله يدوياً"
          : "في انتظار التحقق اليدوي",
      });
      continue;
    }

    const rule = item.verificationRule;
    if (!rule) {
      results.push({
        itemId: item.id,
        verified: false,
        reason: "No verification rule configured",
        reasonAr: "لم يتم تكوين قاعدة التحقق",
      });
      continue;
    }

    const result = await runChecker(ctx, rule);

    // Update DB record
    await item.update({
      autoVerified: result.verified,
      autoVerifiedDetails: {
        reason: result.reason,
        reasonAr: result.reasonAr,
        ...(result.details || {}),
      },
      lastVerifiedAt: new Date(),
    });

    results.push({
      itemId: item.id,
      ...result,
    });
  }

  const allMandatoryVerified = items
    .filter((i) => i.isMandatory)
    .every((i) => {
      if (i.verificationType === "manual") return i.isCompleted;
      const r = results.find((res) => res.itemId === i.id);
      return r?.verified || i.isCompleted; // overridden items count as completed
    });

  return { gateId, items: results, allMandatoryVerified };
}

/**
 * Verify a single checklist item.
 */
export async function verifyItem(itemId: string): Promise<VerificationResult> {
  const item = await GateChecklist.findByPk(itemId);
  if (!item) throw new AppError("Checklist item not found", 404);

  if (item.verificationType === "manual") {
    return {
      itemId: item.id,
      verified: item.isCompleted,
      reason: item.isCompleted ? "Manually completed" : "Awaiting manual check",
      reasonAr: item.isCompleted
        ? "تم إكماله يدوياً"
        : "في انتظار التحقق اليدوي",
    };
  }

  const gate = await Gate.findByPk(item.gateId);
  if (!gate) throw new AppError("Gate not found", 404);

  const rule = item.verificationRule;
  if (!rule) {
    return {
      itemId: item.id,
      verified: false,
      reason: "No verification rule configured",
      reasonAr: "لم يتم تكوين قاعدة التحقق",
    };
  }

  const ctx: CheckerContext = {
    playerId: gate.playerId,
    gateStartedAt: gate.startedAt,
  };

  const result = await runChecker(ctx, rule);

  await item.update({
    autoVerified: result.verified,
    autoVerifiedDetails: {
      reason: result.reason,
      reasonAr: result.reasonAr,
      ...(result.details || {}),
    },
    lastVerifiedAt: new Date(),
  });

  return { itemId: item.id, ...result };
}

// ══════════════════════════════════════════
// CHECKER DISPATCHER
// ══════════════════════════════════════════

async function runChecker(ctx: CheckerContext, rule: any) {
  const checkType = rule.check;
  const checker = checkers[checkType];
  if (!checker) {
    return {
      verified: false,
      reason: `Unknown check type: ${checkType}`,
      reasonAr: `نوع تحقق غير معروف: ${checkType}`,
    };
  }
  try {
    return await checker(ctx, rule);
  } catch (err: any) {
    return {
      verified: false,
      reason: `Verification error: ${err.message}`,
      reasonAr: `خطأ في التحقق: ${err.message}`,
    };
  }
}

// ══════════════════════════════════════════
// INDIVIDUAL CHECKERS
// ══════════════════════════════════════════

/**
 * Check if player has document(s) of specific type.
 * Rule: { check: "has_document", entityType: "Player", docType: ["ID", "Passport"], status: ["Active", "Valid"] }
 */
async function checkHasDocument(ctx: CheckerContext, rule: any) {
  const where: any = {
    entityType: rule.entityType || "Player",
    entityId: ctx.playerId,
  };
  if (rule.docType) where.type = { [Op.in]: rule.docType };
  if (rule.status) where.status = { [Op.in]: rule.status };

  const count = await Document.count({ where });
  const docTypes = (rule.docType || []).join(", ");

  return {
    verified: count > 0,
    reason:
      count > 0
        ? `Found ${count} ${docTypes} document(s)`
        : `No ${docTypes} documents found`,
    reasonAr:
      count > 0
        ? `تم العثور على ${count} وثيقة (${docTypes})`
        : `لم يتم العثور على وثائق (${docTypes})`,
    details: { count, docTypes: rule.docType },
  };
}

/**
 * Check if player has a contract of specific type.
 * Rule: { check: "has_contract", contractType: "Representation", requireSignature: true }
 */
async function checkHasContract(ctx: CheckerContext, rule: any) {
  const where: any = { playerId: ctx.playerId };
  if (rule.contractType) where.contractType = rule.contractType;
  if (rule.status) where.status = { [Op.in]: rule.status };

  const contracts = await Contract.findAll({ where, limit: 5 });

  if (contracts.length === 0) {
    return {
      verified: false,
      reason: `No ${rule.contractType || ""} contract found`,
      reasonAr: `لم يتم العثور على عقد ${rule.contractType || ""}`,
    };
  }

  if (rule.requireSignature) {
    const signed = contracts.find((c: any) => c.signedAt != null);
    if (!signed) {
      return {
        verified: false,
        reason: `${rule.contractType} contract exists but not signed`,
        reasonAr: `عقد ${rule.contractType} موجود ولكن غير موقع`,
        details: { contractCount: contracts.length, signed: false },
      };
    }
  }

  return {
    verified: true,
    reason: `${rule.contractType || "Contract"} found and verified`,
    reasonAr: `تم التحقق من عقد ${rule.contractType || ""}`,
    details: { contractCount: contracts.length },
  };
}

/**
 * Check a single player field.
 * Rule: { check: "player_field", field: "currentClubId", condition: "not_null" }
 * Rule: { check: "player_field", field: "playerType", value: "Youth" }
 */
async function checkPlayerField(ctx: CheckerContext, rule: any) {
  const player = await Player.findByPk(ctx.playerId);
  if (!player) {
    return {
      verified: false,
      reason: "Player not found",
      reasonAr: "اللاعب غير موجود",
    };
  }

  const value = (player as any)[rule.field];

  if (rule.condition === "not_null") {
    const filled = value != null && value !== "";
    return {
      verified: filled,
      reason: filled ? `${rule.field} is set` : `${rule.field} is not set`,
      reasonAr: filled ? `${rule.field} مُعبأ` : `${rule.field} غير مُعبأ`,
      details: { field: rule.field, hasValue: filled },
    };
  }

  if (rule.value !== undefined) {
    const matches = value === rule.value;
    return {
      verified: matches,
      reason: matches
        ? `${rule.field} = ${rule.value}`
        : `${rule.field} ≠ ${rule.value} (actual: ${value})`,
      reasonAr: matches
        ? `${rule.field} = ${rule.value}`
        : `${rule.field} ≠ ${rule.value}`,
      details: { field: rule.field, expected: rule.value, actual: value },
    };
  }

  return {
    verified: false,
    reason: "Invalid rule condition",
    reasonAr: "شرط قاعدة غير صالح",
  };
}

/**
 * Check multiple player fields are filled.
 * Rule: { check: "player_fields_filled", fields: ["photoUrl", "nationality", "position", "dateOfBirth"] }
 */
async function checkPlayerFieldsFilled(ctx: CheckerContext, rule: any) {
  const player = await Player.findByPk(ctx.playerId);
  if (!player) {
    return {
      verified: false,
      reason: "Player not found",
      reasonAr: "اللاعب غير موجود",
    };
  }

  const missing: string[] = [];
  for (const field of rule.fields) {
    const val = (player as any)[field];
    if (val == null || val === "" || val === 0) {
      missing.push(field);
    }
  }

  return {
    verified: missing.length === 0,
    reason:
      missing.length === 0
        ? `All fields filled: ${rule.fields.join(", ")}`
        : `Missing fields: ${missing.join(", ")}`,
    reasonAr:
      missing.length === 0
        ? `جميع الحقول مُعبأة`
        : `حقول ناقصة: ${missing.join(", ")}`,
    details: { required: rule.fields, missing },
  };
}

/**
 * Check if player has note(s).
 * Rule: { check: "has_note", ownerType: "Player", contentContains: "development plan", afterGateStart: true }
 */
async function checkHasNote(ctx: CheckerContext, rule: any) {
  const where: any = {
    ownerType: rule.ownerType || "Player",
    ownerId: ctx.playerId,
  };

  if (rule.contentContains) {
    where.content = { [Op.iLike]: `%${rule.contentContains}%` };
  }

  if (rule.afterGateStart && ctx.gateStartedAt) {
    where.createdAt = { [Op.gte]: ctx.gateStartedAt };
  }

  const count = await Note.count({ where });

  return {
    verified: count > 0,
    reason:
      count > 0 ? `Found ${count} matching note(s)` : "No matching notes found",
    reasonAr:
      count > 0
        ? `تم العثور على ${count} ملاحظة`
        : "لم يتم العثور على ملاحظات مطابقة",
    details: { count },
  };
}

/**
 * Check if player has recent valuation.
 * Rule: { check: "has_valuation", afterGateStart: true }
 */
async function checkHasValuation(ctx: CheckerContext, rule: any) {
  const where: any = { playerId: ctx.playerId };

  if (rule.afterGateStart && ctx.gateStartedAt) {
    where.createdAt = { [Op.gte]: ctx.gateStartedAt };
  }

  const count = await Valuation.count({ where });

  return {
    verified: count > 0,
    reason:
      count > 0
        ? `Found ${count} valuation record(s)`
        : "No valuation records found",
    reasonAr:
      count > 0
        ? `تم العثور على ${count} سجل تقييم`
        : "لم يتم العثور على سجلات تقييم",
    details: { count },
  };
}

/**
 * Check if player has scouting baseline stats.
 * Rule: { check: "has_scouting_stats" }
 */
async function checkHasScoutingStats(ctx: CheckerContext, _rule: any) {
  // Find watchlist entries linked to this player, then screening cases
  // ScreeningCase has baselineStats JSONB
  const cases = await ScreeningCase.findAll({
    include: [
      {
        model: Watchlist,
        as: "watchlist",
        required: true,
      },
    ],
  });

  // Filter cases that have non-empty baselineStats
  const withStats = cases.filter((c: any) => {
    const stats = c.baselineStats;
    return stats && typeof stats === "object" && Object.keys(stats).length > 0;
  });

  return {
    verified: withStats.length > 0,
    reason:
      withStats.length > 0
        ? `Found ${withStats.length} screening case(s) with baseline stats`
        : "No baseline statistics found in screening cases",
    reasonAr:
      withStats.length > 0
        ? `تم العثور على ${withStats.length} حالة فحص مع إحصائيات أساسية`
        : "لم يتم العثور على إحصائيات أساسية",
    details: { count: withStats.length },
  };
}

/**
 * Check if player performance stats were updated after gate start.
 * Rule: { check: "player_stats_updated", afterGateStart: true }
 */
async function checkPlayerStatsUpdated(ctx: CheckerContext, rule: any) {
  const player = await Player.findByPk(ctx.playerId);
  if (!player) {
    return {
      verified: false,
      reason: "Player not found",
      reasonAr: "اللاعب غير موجود",
    };
  }

  // Check if stats fields are filled
  const statsFields = [
    "speed",
    "passing",
    "shooting",
    "defense",
    "fitness",
    "tactical",
  ];
  const filled = statsFields.filter((f) => {
    const val = (player as any)[f];
    return val != null && val > 0;
  });

  if (filled.length === 0) {
    return {
      verified: false,
      reason: "No performance stats recorded",
      reasonAr: "لم يتم تسجيل إحصائيات الأداء",
      details: { filled: [], missing: statsFields },
    };
  }

  // If afterGateStart is set, check updatedAt
  if (rule.afterGateStart && ctx.gateStartedAt) {
    const updatedAfter = (player as any).updatedAt >= ctx.gateStartedAt;
    return {
      verified: updatedAfter && filled.length >= 3,
      reason: updatedAfter
        ? `Stats updated after gate start (${filled.length}/6 filled)`
        : "Stats not updated since gate started",
      reasonAr: updatedAfter
        ? `تم تحديث الإحصائيات بعد بدء البوابة (${filled.length}/6)`
        : "لم يتم تحديث الإحصائيات منذ بدء البوابة",
      details: { filled, updatedAt: (player as any).updatedAt },
    };
  }

  return {
    verified: filled.length >= 3,
    reason: `${filled.length}/6 performance stats filled`,
    reasonAr: `${filled.length}/6 إحصائيات أداء مُعبأة`,
    details: { filled },
  };
}

/**
 * Conditional checker: if/then/else.
 * Rule: { check: "conditional", condition: {...}, then: {...}, else: "skip" }
 */
async function checkConditional(ctx: CheckerContext, rule: any) {
  const condResult = await runChecker(ctx, rule.condition);

  if (condResult.verified) {
    // Condition met → run "then" checker
    return await runChecker(ctx, rule.then);
  } else {
    // Condition not met → run "else" or skip
    if (rule.else === "skip") {
      return {
        verified: true,
        reason: "Condition not applicable — auto-passed",
        reasonAr: "الشرط غير منطبق — تم التجاوز تلقائياً",
        details: { skipped: true, conditionField: rule.condition?.field },
      };
    }
    return await runChecker(ctx, rule.else);
  }
}
