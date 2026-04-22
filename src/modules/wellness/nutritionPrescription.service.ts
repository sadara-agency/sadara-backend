import {
  NutritionPrescription,
  PrescriptionMeal,
  type TriggeringReason,
} from "./nutritionPrescription.model";
import type {
  IssuePrescriptionDTO,
  UpdatePrescriptionDTO,
  ListPrescriptionsQueryDTO,
} from "./nutritionPrescription.validation";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";

export async function listPrescriptions(
  query: ListPrescriptionsQueryDTO,
  user?: AuthUser,
) {
  const { page, limit, playerId, currentOnly } = query;
  const where: any = {};
  if (playerId) where.playerId = playerId;
  if (currentOnly) where.supersededAt = null;

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await NutritionPrescription.findAndCountAll({
    where,
    include: [{ model: PrescriptionMeal, as: "meals" }],
    limit,
    offset: (page - 1) * limit,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getCurrentPrescription(
  playerId: string,
  user?: AuthUser,
): Promise<NutritionPrescription | null> {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) return null;

  return NutritionPrescription.findOne({
    where: { playerId, supersededAt: null },
    include: [{ model: PrescriptionMeal, as: "meals" }],
    order: [["versionNumber", "DESC"]],
  });
}

export async function getVersionHistory(
  playerId: string,
  user?: AuthUser,
): Promise<NutritionPrescription[]> {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) return [];

  return NutritionPrescription.findAll({
    where: { playerId },
    include: [{ model: PrescriptionMeal, as: "meals" }],
    order: [["versionNumber", "DESC"]],
  });
}

export async function getPrescriptionById(
  id: string,
  user?: AuthUser,
): Promise<NutritionPrescription> {
  const prescription = await NutritionPrescription.findByPk(id, {
    include: [{ model: PrescriptionMeal, as: "meals" }],
  });
  if (!prescription) throw new AppError("Prescription not found", 404);

  const allowed = await checkRowAccess(
    "wellness",
    { playerId: prescription.playerId },
    user,
  );
  if (!allowed) throw new AppError("Prescription not found", 404);

  return prescription;
}

export async function issuePrescription(
  data: IssuePrescriptionDTO,
  userId: string,
): Promise<NutritionPrescription> {
  const existing = await NutritionPrescription.findOne({
    where: { playerId: data.playerId, supersededAt: null },
  });
  if (existing) {
    throw new AppError(
      "Player already has an active prescription. Use reissue to create a new version.",
      409,
    );
  }

  const prescription = await NutritionPrescription.create({
    ...data,
    versionNumber: 1,
    issuedBy: userId,
    triggeringReason: "manual",
  });

  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return prescription;
}

/**
 * Creates a new prescription version triggered by a scan, injury, or manual
 * reissue. Copies macro targets and meal structure from the superseded version.
 * Returns null if the player has no current prescription (caller handles silently).
 */
export async function issueNewVersion(
  playerId: string,
  reason: TriggeringReason,
  triggeringScanId?: string,
  userId?: string,
): Promise<NutritionPrescription | null> {
  const current = await NutritionPrescription.findOne({
    where: { playerId, supersededAt: null },
    include: [{ model: PrescriptionMeal, as: "meals" }],
  });

  if (!current) return null;

  const newVersion = await NutritionPrescription.create({
    playerId,
    trainingBlockId: current.trainingBlockId,
    versionNumber: current.versionNumber + 1,
    issuedBy: userId ?? current.issuedBy,
    triggeringReason: reason,
    triggeringScanId: triggeringScanId ?? null,
    targetCalories: current.targetCalories,
    targetProteinG: current.targetProteinG,
    targetCarbsG: current.targetCarbsG,
    targetFatG: current.targetFatG,
    hydrationTargetMl: current.hydrationTargetMl,
    preTrainingGuidance: current.preTrainingGuidance,
    postTrainingGuidance: current.postTrainingGuidance,
    notes: current.notes,
  });

  if (current.meals && current.meals.length > 0) {
    await PrescriptionMeal.bulkCreate(
      current.meals.map((m) => ({
        prescriptionId: newVersion.id,
        dayOfWeek: m.dayOfWeek,
        mealType: m.mealType,
        description: m.description,
        sortOrder: m.sortOrder,
        notes: m.notes,
      })),
    );
  }

  await current.update({
    supersededAt: new Date(),
    supersededBy: newVersion.id,
  });

  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return newVersion;
}

export async function updatePrescription(
  id: string,
  data: UpdatePrescriptionDTO,
): Promise<NutritionPrescription> {
  const prescription = await getPrescriptionById(id);
  if (prescription.supersededAt) {
    throw new AppError("Cannot update a superseded prescription", 422);
  }
  await prescription.update(data);
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return prescription;
}

export async function deletePrescription(id: string): Promise<{ id: string }> {
  const prescription = await getPrescriptionById(id);
  if (prescription.supersededAt) {
    throw new AppError("Cannot delete a superseded prescription", 422);
  }
  await prescription.destroy();
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return { id };
}
