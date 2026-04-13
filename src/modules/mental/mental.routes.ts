import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as mentalController from "./mental.controller";
import {
  createTemplateSchema,
  updateTemplateSchema,
  createAssessmentSchema,
  updateAssessmentSchema,
  listAssessmentsSchema,
} from "./mental.validation";

const router = Router();
router.use(authenticate);

// ── Templates ──

/**
 * @swagger
 * /mental/templates:
 *   get:
 *     summary: List mental assessment templates
 *     tags: [Mental Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of templates
 */
router.get(
  "/templates",
  authorizeModule("mental", "read"),
  dynamicFieldAccess("mental"),
  cacheRoute("mental-templates", CacheTTL.LONG),
  asyncHandler(mentalController.listTemplates),
);

router.get(
  "/templates/:id",
  authorizeModule("mental", "read"),
  dynamicFieldAccess("mental"),
  cacheRoute("mental-template", CacheTTL.LONG),
  asyncHandler(mentalController.getTemplate),
);

router.post(
  "/templates",
  authorizeModule("mental", "create"),
  validate(createTemplateSchema),
  asyncHandler(mentalController.createTemplate),
);

router.patch(
  "/templates/:id",
  authorizeModule("mental", "update"),
  validate(updateTemplateSchema),
  asyncHandler(mentalController.updateTemplate),
);

router.delete(
  "/templates/:id",
  authorizeModule("mental", "delete"),
  asyncHandler(mentalController.deleteTemplate),
);

// ── Assessments ──

/**
 * @swagger
 * /mental/assessments:
 *   get:
 *     summary: List mental assessments (privacy-gated)
 *     tags: [Mental Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of assessments
 */
router.get(
  "/assessments",
  authorizeModule("mental", "read"),
  dynamicFieldAccess("mental"),
  validate(listAssessmentsSchema, "query"),
  asyncHandler(mentalController.listAssessments),
);

router.get(
  "/assessments/alerts",
  authorizeModule("mental", "read"),
  dynamicFieldAccess("mental"),
  asyncHandler(mentalController.getAlerts),
);

router.get(
  "/assessments/player/:playerId/trend",
  authorizeModule("mental", "read"),
  dynamicFieldAccess("mental"),
  asyncHandler(mentalController.getTrend),
);

router.get(
  "/assessments/:id",
  authorizeModule("mental", "read"),
  dynamicFieldAccess("mental"),
  asyncHandler(mentalController.getAssessment),
);

router.post(
  "/assessments",
  authorizeModule("mental", "create"),
  validate(createAssessmentSchema),
  asyncHandler(mentalController.createAssessment),
);

router.patch(
  "/assessments/:id",
  authorizeModule("mental", "update"),
  validate(updateAssessmentSchema),
  asyncHandler(mentalController.updateAssessment),
);

router.delete(
  "/assessments/:id",
  authorizeModule("mental", "delete"),
  asyncHandler(mentalController.deleteAssessment),
);

export default router;
