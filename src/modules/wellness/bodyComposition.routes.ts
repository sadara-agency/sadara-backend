import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { authorizePlayerPackage } from "@middleware/packageAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { documentUploadChain } from "@middleware/upload";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./bodyComposition.controller";
import {
  createScanSchema,
  updateScanSchema,
  listScansQuerySchema,
  getScanSchema,
  getPlayerScansSchema,
} from "./bodyComposition.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /body-compositions:
 *   get:
 *     tags: [BodyCompositions]
 *     summary: List all InBody scans (admin/coach view)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated list of InBody scans }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
  "/",
  authorizeModule("wellness", "read"),
  validate(listScansQuerySchema, "query"),
  dynamicFieldAccess("wellness"),
  cacheRoute("body-compositions", CacheTTL.MEDIUM),
  asyncHandler(ctrl.list),
);

/**
 * @swagger
 * /body-compositions/player/{playerId}:
 *   get:
 *     tags: [BodyCompositions]
 *     summary: List InBody scans for a specific player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated scans for the player }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Player not found }
 */
router.get(
  "/player/:playerId",
  authorizeModule("wellness", "read"),
  authorizePlayerPackage("wellness", "read"),
  validate(getPlayerScansSchema, "params"),
  validate(listScansQuerySchema, "query"),
  dynamicFieldAccess("wellness"),
  cacheRoute("body-compositions-player", CacheTTL.MEDIUM),
  asyncHandler(ctrl.listForPlayer),
);

/**
 * @swagger
 * /body-compositions/player/{playerId}/latest:
 *   get:
 *     tags: [BodyCompositions]
 *     summary: Get the most recent InBody scan for a player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Latest InBody scan }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: No scans found }
 */
router.get(
  "/player/:playerId/latest",
  authorizeModule("wellness", "read"),
  authorizePlayerPackage("wellness", "read"),
  validate(getPlayerScansSchema, "params"),
  dynamicFieldAccess("wellness"),
  asyncHandler(ctrl.getLatest),
);

/**
 * @swagger
 * /body-compositions/{id}:
 *   get:
 *     tags: [BodyCompositions]
 *     summary: Get a single InBody scan by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: InBody scan detail }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Scan not found }
 */
router.get(
  "/:id",
  authorizeModule("wellness", "read"),
  validate(getScanSchema, "params"),
  dynamicFieldAccess("wellness"),
  cacheRoute("body-composition", CacheTTL.MEDIUM),
  asyncHandler(ctrl.getById),
);

/**
 * @swagger
 * /body-compositions/extract:
 *   post:
 *     tags: [BodyCompositions]
 *     summary: Extract InBody fields from an uploaded PDF / PNG / JPEG
 *     description: |
 *       Read-only endpoint. Accepts a multipart upload of an InBody report
 *       and returns the values it could parse. The frontend uses the result
 *       to pre-fill the manual scan form so the coach can review and submit
 *       — no scan is written by this endpoint.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Extracted values
 *       400: { description: No file or invalid upload }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       422: { description: File could not be read }
 */
router.post(
  "/extract",
  authorizeModule("wellness", "create"),
  ...documentUploadChain,
  asyncHandler(ctrl.extract),
);

/**
 * @swagger
 * /body-compositions:
 *   post:
 *     tags: [BodyCompositions]
 *     summary: Record a new InBody scan
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateScanDTO'
 *     responses:
 *       201: { description: Scan created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       409: { description: Scan already exists for this date }
 */
router.post(
  "/",
  authorizeModule("wellness", "create"),
  validate(createScanSchema),
  asyncHandler(ctrl.create),
);

/**
 * @swagger
 * /body-compositions/{id}:
 *   patch:
 *     tags: [BodyCompositions]
 *     summary: Update an InBody scan
 *     security: [{ bearerAuth: [] }]
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
 *             $ref: '#/components/schemas/UpdateScanDTO'
 *     responses:
 *       200: { description: Scan updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Scan not found }
 *       409: { description: Scan already exists for this date }
 */
router.patch(
  "/:id",
  authorizeModule("wellness", "update"),
  validate(updateScanSchema),
  asyncHandler(ctrl.update),
);

/**
 * @swagger
 * /body-compositions/{id}:
 *   delete:
 *     tags: [BodyCompositions]
 *     summary: Delete an InBody scan
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Scan deleted }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Scan not found }
 */
router.delete(
  "/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
