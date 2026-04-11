import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
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
  cacheRoute("mental-templates", CacheTTL.LONG),
  mentalController.listTemplates,
);

router.get(
  "/templates/:id",
  authorizeModule("mental", "read"),
  cacheRoute("mental-template", CacheTTL.LONG),
  mentalController.getTemplate,
);

router.post(
  "/templates",
  authorizeModule("mental", "create"),
  validate(createTemplateSchema),
  mentalController.createTemplate,
);

router.patch(
  "/templates/:id",
  authorizeModule("mental", "update"),
  validate(updateTemplateSchema),
  mentalController.updateTemplate,
);

router.delete(
  "/templates/:id",
  authorizeModule("mental", "delete"),
  mentalController.deleteTemplate,
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
  validate(listAssessmentsSchema, "query"),
  mentalController.listAssessments,
);

router.get(
  "/assessments/alerts",
  authorizeModule("mental", "read"),
  mentalController.getAlerts,
);

router.get(
  "/assessments/player/:playerId/trend",
  authorizeModule("mental", "read"),
  mentalController.getTrend,
);

router.get(
  "/assessments/:id",
  authorizeModule("mental", "read"),
  mentalController.getAssessment,
);

router.post(
  "/assessments",
  authorizeModule("mental", "create"),
  validate(createAssessmentSchema),
  mentalController.createAssessment,
);

router.patch(
  "/assessments/:id",
  authorizeModule("mental", "update"),
  validate(updateAssessmentSchema),
  mentalController.updateAssessment,
);

router.delete(
  "/assessments/:id",
  authorizeModule("mental", "delete"),
  mentalController.deleteAssessment,
);

export default router;
