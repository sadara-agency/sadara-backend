// ═══════════════════════════════════════════════════════════════
// src/cron/cron.routes.ts
//
// Cron job management — status, toggle, and manual test triggers.
//
// Usage: GET  /api/v1/cron/status           — list all jobs with state
//        PATCH /api/v1/cron/toggle           — enable/disable a job
//        PATCH /api/v1/cron/toggle-all       — bulk enable/disable
//        GET  /api/v1/cron/test/all          — run all jobs manually
//        GET  /api/v1/cron/test/:jobName     — run a specific job
// ═══════════════════════════════════════════════════════════════

import { Router, Response } from "express";
import { asyncHandler, AppError } from "@middleware/errorHandler";
import { authenticate, authorize } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { z } from "zod";
import {
  runJob,
  runAllJobs,
  getJobNames,
  getJobSchedules,
  getDisabledJobs,
  setJobDisabled,
  setAllJobsDisabled,
} from "./scheduler";

const router = Router();
router.use(authenticate);
router.use(authorize("Admin"));

// ── Schemas ──

const toggleSchema = z.object({
  jobName: z.string().min(1),
  enabled: z.boolean(),
});

const toggleAllSchema = z.object({
  enabled: z.boolean(),
});

// ── Status ──

router.get(
  "/status",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const names = getJobNames();
    const schedules = getJobSchedules();
    const disabledMap = await getDisabledJobs();

    const jobs = names.map((name) => ({
      name,
      schedule: schedules[name] || null,
      enabled: !disabledMap[name],
      disabledBy: disabledMap[name]?.disabledBy || null,
      disabledAt: disabledMap[name]?.disabledAt || null,
    }));

    sendSuccess(res, { jobs });
  }),
);

// ── Toggle single job ──

router.patch(
  "/toggle",
  validate(toggleSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { jobName, enabled } = req.body;

    if (!getJobNames().includes(jobName)) {
      throw new AppError(`Unknown job: ${jobName}`, 404);
    }

    await setJobDisabled(jobName, !enabled, {
      userId: req.user!.id,
      userName: req.user!.fullName,
    });

    await logAudit(
      enabled ? "ENABLE" : "DISABLE",
      "cron_job",
      jobName,
      buildAuditContext(req.user!, req.ip),
      `Cron job "${jobName}" ${enabled ? "enabled" : "disabled"}`,
    );

    sendSuccess(
      res,
      { jobName, enabled },
      `Job "${jobName}" ${enabled ? "enabled" : "disabled"}`,
    );
  }),
);

// ── Toggle all jobs ──

router.patch(
  "/toggle-all",
  validate(toggleAllSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { enabled } = req.body;

    const count = await setAllJobsDisabled(!enabled, {
      userId: req.user!.id,
      userName: req.user!.fullName,
    });

    await logAudit(
      enabled ? "ENABLE_ALL" : "DISABLE_ALL",
      "cron_job",
      "ALL",
      buildAuditContext(req.user!, req.ip),
      `All ${count} cron jobs ${enabled ? "enabled" : "disabled"}`,
    );

    sendSuccess(
      res,
      { enabled, count },
      `All ${count} jobs ${enabled ? "enabled" : "disabled"}`,
    );
  }),
);

// ── Manual test triggers ──

// List available jobs
router.get(
  "/test",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    sendSuccess(res, {
      jobs: getJobNames(),
      usage: "GET /api/v1/cron/test/:jobName  or  GET /api/v1/cron/test/all",
    });
  }),
);

// Run all jobs
router.get(
  "/test/all",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const results = await runAllJobs();
    sendSuccess(res, results, "All cron jobs executed");
  }),
);

// Run a specific job
router.get(
  "/test/:jobName",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await runJob(req.params.jobName);
    if (!result) {
      sendSuccess(res, {
        error: `Unknown job: ${req.params.jobName}`,
        available: getJobNames(),
      });
      return;
    }
    sendSuccess(res, result, `Job "${req.params.jobName}" executed`);
  }),
);

export default router;
