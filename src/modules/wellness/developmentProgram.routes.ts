import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./developmentProgram.controller";
import {
  createProgramSchema,
  updateProgramSchema,
  addExerciseToProgramSchema,
  reorderExercisesSchema,
  listProgramsQuerySchema,
} from "./developmentProgram.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /development-programs:
 *   get:
 *     summary: List development programs
 *     tags: [DevelopmentPrograms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: trainingBlockId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: programType
 *         schema: { type: string, enum: [gym, field, rehab, recovery, mixed] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated program list
 */
router.get(
  "/",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  cacheRoute("development-programs", CacheTTL.SHORT),
  validate(listProgramsQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

/**
 * @swagger
 * /development-programs/{id}:
 *   get:
 *     summary: Get a development program by ID (includes exercises)
 *     tags: [DevelopmentPrograms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Program with exercises array
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  asyncHandler(ctrl.getById),
);

/**
 * @swagger
 * /development-programs:
 *   post:
 *     summary: Create a new development program
 *     tags: [DevelopmentPrograms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProgramDTO'
 *     responses:
 *       201:
 *         description: Program created
 */
router.post(
  "/",
  authorizeModule("wellness", "create"),
  validate(createProgramSchema),
  asyncHandler(ctrl.create),
);

/**
 * @swagger
 * /development-programs/{id}:
 *   patch:
 *     summary: Update a development program
 *     tags: [DevelopmentPrograms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated program
 *       404:
 *         description: Not found
 */
router.patch(
  "/:id",
  authorizeModule("wellness", "update"),
  validate(updateProgramSchema),
  asyncHandler(ctrl.update),
);

/**
 * @swagger
 * /development-programs/{id}:
 *   delete:
 *     summary: Delete a development program (soft-deletes if sessions exist)
 *     tags: [DevelopmentPrograms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted or deactivated
 *       404:
 *         description: Not found
 */
router.delete(
  "/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.remove),
);

/**
 * @swagger
 * /development-programs/{id}/exercises:
 *   post:
 *     summary: Add an exercise to a program
 *     tags: [DevelopmentPrograms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Exercise added
 *       404:
 *         description: Program not found
 */
router.post(
  "/:id/exercises",
  authorizeModule("wellness", "update"),
  validate(addExerciseToProgramSchema),
  asyncHandler(ctrl.addExercise),
);

/**
 * @swagger
 * /development-programs/{id}/exercises/{exerciseId}:
 *   delete:
 *     summary: Remove an exercise from a program
 *     tags: [DevelopmentPrograms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: exerciseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Exercise removed
 *       404:
 *         description: Exercise not found in program
 */
router.delete(
  "/:id/exercises/:exerciseId",
  authorizeModule("wellness", "update"),
  asyncHandler(ctrl.removeExercise),
);

/**
 * @swagger
 * /development-programs/{id}/exercises/reorder:
 *   put:
 *     summary: Reorder exercises in a program
 *     tags: [DevelopmentPrograms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderedExerciseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Program with reordered exercises
 */
router.put(
  "/:id/exercises/reorder",
  authorizeModule("wellness", "update"),
  validate(reorderExercisesSchema),
  asyncHandler(ctrl.reorderExercises),
);

export default router;
