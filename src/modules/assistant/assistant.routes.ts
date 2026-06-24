import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { chatSchema } from "./assistant.validation";
import * as ctrl from "./assistant.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /assistant/chat:
 *   post:
 *     summary: Chat with the read-only AI assistant
 *     description: >
 *       Runs an agent loop with read-only tools that wrap existing services.
 *       Every tool call enforces the requesting user's RBAC and field-access,
 *       so the assistant can never surface data the user cannot otherwise see.
 *       Conversation history is client-supplied (stateless).
 *     tags: [Assistant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 4000
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [role, content]
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Assistant reply
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     reply: { type: string }
 *                     iterations: { type: integer }
 */
router.post(
  "/chat",
  authorizeModule("assistant", "read"),
  validate(chatSchema, "body"),
  asyncHandler(ctrl.chat),
);

export default router;
