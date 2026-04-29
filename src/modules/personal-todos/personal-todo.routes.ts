import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createPersonalTodoSchema,
  updatePersonalTodoSchema,
  personalTodoQuerySchema,
  personalTodoParamsSchema,
  reorderPersonalTodosSchema,
} from "./personal-todo.validation";
import * as personalTodoController from "./personal-todo.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /personal-todos:
 *   get:
 *     summary: List personal todos for the authenticated user
 *     tags: [PersonalTodos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of personal todos
 */
router.get(
  "/",
  authorizeModule("personal-todos", "read"),
  validate(personalTodoQuerySchema, "query"),
  asyncHandler(personalTodoController.list),
);

router.get(
  "/:id",
  authorizeModule("personal-todos", "read"),
  validate(personalTodoParamsSchema, "params"),
  asyncHandler(personalTodoController.getById),
);

router.post(
  "/",
  authorizeModule("personal-todos", "create"),
  validate(createPersonalTodoSchema),
  asyncHandler(personalTodoController.create),
);

router.patch(
  "/reorder",
  authorizeModule("personal-todos", "update"),
  validate(reorderPersonalTodosSchema),
  asyncHandler(personalTodoController.reorder),
);

router.patch(
  "/:id",
  authorizeModule("personal-todos", "update"),
  validate(personalTodoParamsSchema, "params"),
  validate(updatePersonalTodoSchema),
  asyncHandler(personalTodoController.update),
);

router.delete(
  "/:id",
  authorizeModule("personal-todos", "delete"),
  validate(personalTodoParamsSchema, "params"),
  asyncHandler(personalTodoController.remove),
);

export default router;
