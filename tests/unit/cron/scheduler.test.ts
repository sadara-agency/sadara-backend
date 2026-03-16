// ─────────────────────────────────────────────────────────────
// tests/unit/cron/scheduler.test.ts
// Unit tests for cron scheduler: job registry, runJob, retry
// logic, and distributed locking.
// ─────────────────────────────────────────────────────────────

// Mock Redis before any imports
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

jest.mock('../../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    set: mockRedisSet,
    del: mockRedisDel,
  })),
  isRedisConnected: jest.fn(() => true),
}));

// Mock node-cron to prevent actual scheduling
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

// Mock database
jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn() },
}));

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock all engine imports to avoid pulling in real DB-dependent code
jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notifyByRole: jest.fn(),
  notifyUser: jest.fn(),
  cleanupOldNotifications: jest.fn(),
}));
jest.mock('../../../src/modules/matches/matchAutoTasks', () => ({
  generatePreMatchTasks: jest.fn(),
  generateMatchLevelPreTasks: jest.fn(),
}));
jest.mock('../../../src/cron/engines/performance.engine', () => ({
  checkPerformanceTrends: jest.fn(),
  checkFatigueRisk: jest.fn(),
  checkBreakoutPlayers: jest.fn(),
  checkMinutesDrought: jest.fn(),
  checkConsecutiveLowRatings: jest.fn(),
}));
jest.mock('../../../src/cron/engines/injury.engine', () => ({
  checkInjuryRecurrence: jest.fn(),
  checkReturnToPlay: jest.fn(),
  calculateInjuryRisk: jest.fn(),
  checkSurgeryMilestones: jest.fn(),
}));
jest.mock('../../../src/cron/engines/contract.engine', () => ({
  checkContractRenewalWindow: jest.fn(),
  checkContractValueMismatch: jest.fn(),
  checkLoanReturns: jest.fn(),
  checkStaleDrafts: jest.fn(),
  checkCommissionsDue: jest.fn(),
}));
jest.mock('../../../src/cron/engines/financial.engine', () => ({
  checkInvoiceAging: jest.fn(),
  checkRevenueAnomalies: jest.fn(),
  checkExpenseBudget: jest.fn(),
  checkPlayerROI: jest.fn(),
  checkValuationStaleness: jest.fn(),
}));
jest.mock('../../../src/cron/engines/gate.engine', () => ({
  runGateAutoVerification: jest.fn(),
  checkStaleGates: jest.fn(),
  checkChecklistFollowups: jest.fn(),
  checkGateProgressionNudge: jest.fn(),
  checkClearanceFollowups: jest.fn(),
}));
jest.mock('../../../src/cron/engines/scouting.engine', () => ({
  checkWatchlistStaleness: jest.fn(),
  checkScreeningIncomplete: jest.fn(),
  checkProspectUnrated: jest.fn(),
  checkDeferredDecisions: jest.fn(),
  checkApprovedNotActioned: jest.fn(),
}));
jest.mock('../../../src/cron/engines/training.engine', () => ({
  checkEnrollmentStaleness: jest.fn(),
  checkWorkoutAdherence: jest.fn(),
  checkMetricTargetDeadlines: jest.fn(),
  checkDietAdherence: jest.fn(),
  checkNoTrainingPlan: jest.fn(),
}));
jest.mock('../../../src/cron/engines/systemhealth.engine', () => ({
  detectOrphanRecords: jest.fn(),
  checkPlayerDataCompleteness: jest.fn(),
  escalateStaleTasks: jest.fn(),
  checkRiskRadarConsistency: jest.fn(),
  detectDuplicateRecords: jest.fn(),
}));
jest.mock('../../../src/modules/offers/offerAutoTasks', () => ({
  checkOfferDeadlines: jest.fn(),
  generateOfferCreationTask: jest.fn(),
  generateOfferAcceptedTask: jest.fn(),
}));
jest.mock('../../../src/modules/injuries/injuryAutoTasks', () => ({
  checkInjuryReturnOverdue: jest.fn(),
  checkInjuryTreatmentStale: jest.fn(),
  generateCriticalInjuryTask: jest.fn(),
}));
jest.mock('../../../src/modules/gym/gymAutoTasks', () => ({
  checkWorkoutAssignmentExpiring: jest.fn(),
  checkDietPlanNoAdherence: jest.fn(),
  checkMetricTargetAchieved: jest.fn(),
  checkTrainingCourseCompleted: jest.fn(),
  generateWorkoutCompletedTask: jest.fn(),
}));
jest.mock('../../../src/modules/approvals/approvalAutoTasks', () => ({
  checkApprovalStepOverdue: jest.fn(),
  generateApprovalRejectedTask: jest.fn(),
}));
jest.mock('../../../src/modules/documents/documentAutoTasks', () => ({
  checkDocumentExpiryTasks: jest.fn(),
  checkPlayerMissingDocuments: jest.fn(),
}));
jest.mock('../../../src/modules/referrals/referralAutoTasks', () => ({
  checkReferralOverdue: jest.fn(),
  generateCriticalReferralTask: jest.fn(),
}));
jest.mock('../../../src/modules/esignatures/esignature.service', () => ({
  expireOverdueSignatureRequests: jest.fn().mockResolvedValue({ expired: 0 }),
}));

// Mock appSettings to prevent DB call in syncDisabledJobsToRedis
jest.mock('../../../src/shared/utils/appSettings', () => ({
  getAppSetting: jest.fn().mockResolvedValue(null),
  setAppSetting: jest.fn().mockResolvedValue(undefined),
}));

import { getJobNames, runJob, runAllJobs, startCronJobs } from '../../../src/cron/scheduler';
import { isRedisConnected } from '../../../src/config/redis';
import { logger } from '../../../src/config/logger';
import cron from 'node-cron';

describe('Cron Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);
    // Ensure Redis is connected by default
    (isRedisConnected as jest.Mock).mockReturnValue(true);
  });

  describe('getJobNames', () => {
    it('should return all registered job names', () => {
      const names = getJobNames();
      expect(names).toBeInstanceOf(Array);
      expect(names.length).toBeGreaterThan(40); // 57 jobs registered
    });

    it('should include core job names', () => {
      const names = getJobNames();
      expect(names).toContain('contract-expiry');
      expect(names).toContain('contract-status');
      expect(names).toContain('injury-followups');
      expect(names).toContain('payment-reminders');
      expect(names).toContain('cleanup');
      expect(names).toContain('upcoming-matches');
      expect(names).toContain('document-expiry');
    });

    it('should include engine job names', () => {
      const names = getJobNames();
      // Performance engine
      expect(names).toContain('performance-trends');
      expect(names).toContain('fatigue-risk');
      // Injury engine
      expect(names).toContain('injury-recurrence');
      // Contract engine
      expect(names).toContain('contract-renewal-window');
      // Financial engine
      expect(names).toContain('invoice-aging-tracker');
      // Gate engine
      expect(names).toContain('gate-auto-verify');
      // Scouting engine
      expect(names).toContain('watchlist-staleness');
      // Training engine
      expect(names).toContain('workout-adherence-check');
      // System health engine
      expect(names).toContain('orphan-record-detector');
    });
  });

  describe('runJob', () => {
    it('should return null for unknown job name', async () => {
      const result = await runJob('non-existent-job');
      expect(result).toBeNull();
    });

    it('should run a registered job and return result with duration', async () => {
      const result = await runJob('cleanup');
      expect(result).toBeDefined();
      expect(result!.job).toBe('cleanup');
      expect(typeof result!.duration).toBe('number');
    });

    it('should log start and completion', async () => {
      await runJob('cleanup');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[CRON-TEST] Running: cleanup'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[CRON-TEST] Completed: cleanup'),
      );
    });

    it('should catch and return errors without throwing', async () => {
      // Mock a failing engine
      const { checkPerformanceTrends } = require('../../../src/cron/engines/performance.engine');
      checkPerformanceTrends.mockRejectedValueOnce(new Error('DB connection lost'));

      const result = await runJob('performance-trends');
      expect(result).toBeDefined();
      expect(result!.result).toEqual({ error: 'DB connection lost' });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[CRON-TEST] Failed: performance-trends'),
        expect.anything(),
      );
    });
  });

  describe('runAllJobs', () => {
    it('should run all registered jobs and return results array', async () => {
      const results = await runAllJobs();
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(getJobNames().length);
    });
  });

  describe('startCronJobs', () => {
    it('should schedule all 60 cron jobs', async () => {
      await startCronJobs();
      // node-cron.schedule should be called once per job
      expect(cron.schedule).toHaveBeenCalledTimes(60);
    });

    it('should log initialization', async () => {
      await startCronJobs();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Initializing cron scheduler'),
      );
    });
  });

  describe('distributed locking', () => {
    it('should skip job when lock cannot be acquired', async () => {
      // When Redis SET NX returns null (lock held by another instance)
      mockRedisSet.mockResolvedValueOnce(null);

      // Start the cron jobs so safeJob wrappers are created
      await startCronJobs();

      // Get the wrapped function passed to the first cron.schedule call
      const scheduleCalls = (cron.schedule as jest.Mock).mock.calls;
      // Find the contract-status job (second schedule call based on startCronJobs order)
      const contractStatusCall = scheduleCalls.find(
        (call: [string, () => Promise<void>]) => call[0] === '0 7,19 * * *',
      );
      expect(contractStatusCall).toBeDefined();

      // Execute the wrapped job function
      const wrappedFn = contractStatusCall![1] as () => Promise<void>;
      await wrappedFn();

      // Should log that it was skipped
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Skipped (locked)'),
      );
    });

    it('should proceed when lock is acquired', async () => {
      mockRedisSet.mockResolvedValue('OK');

      await startCronJobs();
      const scheduleCalls = (cron.schedule as jest.Mock).mock.calls;
      // cleanup job — uses simple mock
      const cleanupCall = scheduleCalls.find(
        (call: [string, () => Promise<void>]) => call[0] === '0 3 * * *',
      );
      expect(cleanupCall).toBeDefined();

      await cleanupCall![1]();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[CRON] Completed: cleanup'),
      );
      // Lock should be released after successful execution
      expect(mockRedisDel).toHaveBeenCalled();
    });

    it('should fall through when Redis is not connected', async () => {
      (isRedisConnected as jest.Mock).mockReturnValue(false);

      await startCronJobs();
      const scheduleCalls = (cron.schedule as jest.Mock).mock.calls;
      const cleanupCall = scheduleCalls.find(
        (call: [string, () => Promise<void>]) => call[0] === '0 3 * * *',
      );

      await cleanupCall![1]();

      // Should still complete (lock is auto-granted when no Redis)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[CRON] Completed: cleanup'),
      );
    });
  });

  describe('retry logic', () => {
    it('should retry on failure up to MAX_RETRIES times', async () => {
      const { checkFatigueRisk } = require('../../../src/cron/engines/performance.engine');
      checkFatigueRisk
        .mockRejectedValueOnce(new Error('Transient error 1'))
        .mockRejectedValueOnce(new Error('Transient error 2'))
        .mockRejectedValueOnce(new Error('Transient error 3'));

      await startCronJobs();
      const scheduleCalls = (cron.schedule as jest.Mock).mock.calls;
      const fatigueCall = scheduleCalls.find(
        (call: [string, () => Promise<void>]) => call[0] === '15 7 * * *',
      );
      expect(fatigueCall).toBeDefined();

      await fatigueCall![1]();

      // Should log all 3 attempts failing (initial + 2 retries)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 1 failed: fatigue-risk'),
        expect.anything(),
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 2 failed: fatigue-risk'),
        expect.anything(),
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 3 failed: fatigue-risk'),
        expect.anything(),
      );

      // Should log final failure
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed after 3 attempts: fatigue-risk'),
        expect.anything(),
      );

      // Lock should still be released after all retries exhausted
      expect(mockRedisDel).toHaveBeenCalled();
    });

    it('should succeed on retry after initial failure', async () => {
      const { checkFatigueRisk } = require('../../../src/cron/engines/performance.engine');
      checkFatigueRisk
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce({ checked: 10 });

      await startCronJobs();
      const scheduleCalls = (cron.schedule as jest.Mock).mock.calls;
      const fatigueCall = scheduleCalls.find(
        (call: [string, () => Promise<void>]) => call[0] === '15 7 * * *',
      );

      await fatigueCall![1]();

      // First attempt should fail
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 1 failed'),
        expect.anything(),
      );

      // Should eventually complete
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[CRON] Completed: fatigue-risk'),
      );

      // Should NOT log final failure
      expect(logger.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed after'),
        expect.anything(),
      );
    });
  });
});
