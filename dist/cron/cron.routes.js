"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const apiResponse_1 = require("../shared/utils/apiResponse");
const scheduler_1 = require("./scheduler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('Admin'));
// List available jobs
router.get('/test', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_1.sendSuccess)(res, {
        jobs: (0, scheduler_1.getJobNames)(),
        usage: 'GET /api/v1/cron/test/:jobName  or  GET /api/v1/cron/test/all',
    });
}));
// Run all jobs
router.get('/test/all', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const results = await (0, scheduler_1.runAllJobs)();
    (0, apiResponse_1.sendSuccess)(res, results, 'All cron jobs executed');
}));
// Run a specific job
router.get('/test/:jobName', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await (0, scheduler_1.runJob)(req.params.jobName);
    if (!result) {
        (0, apiResponse_1.sendSuccess)(res, { error: `Unknown job: ${req.params.jobName}`, available: (0, scheduler_1.getJobNames)() });
        return;
    }
    (0, apiResponse_1.sendSuccess)(res, result, `Job "${req.params.jobName}" executed`);
}));
exports.default = router;
//# sourceMappingURL=cron.routes.js.map