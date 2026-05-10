import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./playerInbox.controller";
import {
  createInboxItemSchema,
  updateInboxItemSchema,
  cancelInboxItemSchema,
  inboxQuerySchema,
  myInboxQuerySchema,
  idParamSchema,
} from "./playerInbox.validation";

const router = Router();
router.use(authenticate);
router.use(dynamicFieldAccess("player-inbox"));

// ── Player-facing (ownership enforced in the service, not module RBAC) ──

/**
 * @swagger
 * /player-inbox/me:
 *   get:
 *     summary: List the current player's inbox items
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Sent, Viewed, Acknowledged, Resolved, Cancelled] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [management_order, disciplinary, fine, directive, mental_task] }
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: string, enum: ["true", "false"] }
 *     responses:
 *       200: { description: Paginated list (staffNotes omitted) }
 */
router.get(
  "/me",
  validate(myInboxQuerySchema, "query"),
  asyncHandler(ctrl.listMine),
);

/**
 * @swagger
 * /player-inbox/me/summary:
 *   get:
 *     summary: Unread-count summary for the current player (Action Center badge)
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ total, unread, byCategory }" }
 */
router.get("/me/summary", asyncHandler(ctrl.summaryMine));

/**
 * @swagger
 * /player-inbox/me/{id}:
 *   get:
 *     summary: Get one of the current player's inbox items (stamps firstViewedAt)
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Item detail (staffNotes + receipt trail omitted) }
 *       404: { description: Not found / not theirs }
 */
router.get(
  "/me/:id",
  validate(idParamSchema, "params"),
  asyncHandler(ctrl.getMineById),
);

/**
 * @swagger
 * /player-inbox/me/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge ("Mark as Read") an inbox item
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Acknowledged — acknowledgedAt set, issuer + leadership notified }
 *       404: { description: Not found / not theirs }
 *       422: { description: Already acknowledged / resolved / cancelled }
 */
router.post(
  "/me/:id/acknowledge",
  validate(idParamSchema, "params"),
  asyncHandler(ctrl.acknowledge),
);

// ── Staff-facing ──

/**
 * @swagger
 * /player-inbox:
 *   get:
 *     summary: List inbox items (staff — row-scoped to assigned players)
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list with player + issuedBy }
 */
router.get(
  "/",
  authorizeModule("player-inbox", "read"),
  cacheRoute("player-inbox", CacheTTL.SHORT),
  validate(inboxQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

/**
 * @swagger
 * /player-inbox/{id}:
 *   get:
 *     summary: Get an inbox item with its full receipt trail (staff)
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Item with events[] timeline (sent → viewed → acknowledged …) }
 *       404: { description: Not found }
 */
router.get(
  "/:id",
  authorizeModule("player-inbox", "read"),
  validate(idParamSchema, "params"),
  asyncHandler(ctrl.getById),
);

/**
 * @swagger
 * /player-inbox:
 *   post:
 *     summary: Issue a management order / disciplinary action / fine / directive to a player
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, category, title, body]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               category: { type: string, enum: [management_order, disciplinary, fine, directive, mental_task] }
 *               title: { type: string }
 *               titleAr: { type: string }
 *               body: { type: string }
 *               bodyAr: { type: string }
 *               priority: { type: string, enum: [low, normal, high, critical] }
 *               requiresAcknowledgement: { type: boolean }
 *               fineAmount: { type: number }
 *               fineCurrency: { type: string }
 *               dueAt: { type: string, format: date-time }
 *               attachmentDocumentId: { type: string, format: uuid }
 *               staffNotes: { type: string }
 *     responses:
 *       201: { description: Created — player notified, "sent" event recorded }
 *       404: { description: Player not found }
 */
router.post(
  "/",
  authorizeModule("player-inbox", "create"),
  validate(createInboxItemSchema),
  asyncHandler(ctrl.create),
);

/**
 * @swagger
 * /player-inbox/{id}:
 *   patch:
 *     summary: Edit an inbox item (staff — only while not Resolved/Cancelled)
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated }
 *       422: { description: Item already resolved/cancelled }
 */
router.patch(
  "/:id",
  authorizeModule("player-inbox", "update"),
  validate(idParamSchema, "params"),
  validate(updateInboxItemSchema),
  asyncHandler(ctrl.update),
);

/**
 * @swagger
 * /player-inbox/{id}/resolve:
 *   post:
 *     summary: Mark an inbox item as resolved/closed (staff)
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Resolved }
 */
router.post(
  "/:id/resolve",
  authorizeModule("player-inbox", "update"),
  validate(idParamSchema, "params"),
  asyncHandler(ctrl.resolve),
);

/**
 * @swagger
 * /player-inbox/{id}/cancel:
 *   post:
 *     summary: Cancel an inbox item (staff)
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Cancelled }
 */
router.post(
  "/:id/cancel",
  authorizeModule("player-inbox", "update"),
  validate(idParamSchema, "params"),
  validate(cancelInboxItemSchema),
  asyncHandler(ctrl.cancel),
);

/**
 * @swagger
 * /player-inbox/{id}:
 *   delete:
 *     summary: Hard-delete an inbox item (staff — rare; prefer cancel)
 *     tags: [Player Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete(
  "/:id",
  authorizeModule("player-inbox", "delete"),
  validate(idParamSchema, "params"),
  asyncHandler(ctrl.remove),
);

export default router;
