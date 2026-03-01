// ═══════════════════════════════════════════════════════════════
// src/cron/cron.routes.ts
//
// TEMPORARY — Remove before production deployment.
// Exposes manual triggers for each cron job so you can test them
// without waiting for the schedule.
//
// Usage: GET /api/v1/cron/test/all
//        GET /api/v1/cron/test/contract-expiry
//        GET /api/v1/cron/test/injury-followups
//        etc.
// ═══════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../shared/types';
import { sendSuccess } from '../shared/utils/apiResponse';
import { runJob, runAllJobs, getJobNames } from './scheduler';

const router = Router();
router.use(authenticate);
router.use(authorize('Admin'));

// List available jobs
router.get('/test', asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, {
    jobs: getJobNames(),
    usage: 'GET /api/v1/cron/test/:jobName  or  GET /api/v1/cron/test/all',
  });
}));

// Run all jobs
router.get('/test/all', asyncHandler(async (req: AuthRequest, res: Response) => {
  const results = await runAllJobs();
  sendSuccess(res, results, 'All cron jobs executed');
}));

// Run a specific job
router.get('/test/:jobName', asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await runJob(req.params.jobName);
  if (!result) {
    sendSuccess(res, { error: `Unknown job: ${req.params.jobName}`, available: getJobNames() });
    return;
  }
  sendSuccess(res, result, `Job "${req.params.jobName}" executed`);
}));

export default router;