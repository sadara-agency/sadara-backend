import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createReportSchema, reportQuerySchema } from "./report.schema";
import * as ctrl from "./report.controller";

const router = Router();
router.use(authenticate);

// Predefined reports (must be before /:id to avoid route conflicts)
router.get("/player-portfolio", asyncHandler(ctrl.playerPortfolio));
router.get("/contract-commission", asyncHandler(ctrl.contractCommission));
router.get("/injury-summary", asyncHandler(ctrl.injurySummary));
router.get("/match-tasks", asyncHandler(ctrl.matchTasks));
router.get("/financial-summary", asyncHandler(ctrl.financialSummary));

// Technical reports CRUD
router.get("/", validate(reportQuerySchema, "query"), asyncHandler(ctrl.list));
router.get("/:id", asyncHandler(ctrl.getById));
router.get("/:id/download", asyncHandler(ctrl.download));
router.post("/", validate(createReportSchema), asyncHandler(ctrl.create));
router.delete("/:id", authorize("Admin", "Manager"), asyncHandler(ctrl.remove));

export default router;
