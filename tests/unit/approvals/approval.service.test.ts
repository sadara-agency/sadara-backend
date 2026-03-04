// ─────────────────────────────────────────────────────────────
// tests/unit/approvals/approval.service.test.ts
// Unit tests for approval service — create, list, stats, resolve.
// ─────────────────────────────────────────────────────────────
import { mockUser, mockModelInstance } from '../../setup/test-helpers';

// ── Mock model methods ──
const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockCount = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { authenticate: jest.fn(), query: jest.fn() },
}));

jest.mock('../../../src/modules/approvals/approval.model', () => ({
  ApprovalRequest: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
    create: (...a: unknown[]) => mockCreate(...a),
    count: (...a: unknown[]) => mockCount(...a),
  },
  ApprovalStatus: {},
}));

jest.mock('../../../src/modules/Users/user.model', () => ({
  User: { name: 'User' },
}));

jest.mock('../../../src/modules/notifications/notification.service', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
  notifyByRole: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import * as approvalService from '../../../src/modules/approvals/approval.service';
import { createNotification, notifyByRole } from '../../../src/modules/notifications/notification.service';

// ── Mock approval factory ──
const mockApproval = (overrides: Record<string, any> = {}) => ({
  id: 'approval-001',
  entityType: 'contract',
  entityId: 'contract-001',
  entityTitle: 'Contract: Ahmed – Al Hilal',
  action: 'review',
  status: 'Pending',
  priority: 'high',
  requestedBy: 'user-001',
  assignedTo: null,
  assignedRole: 'Manager',
  comment: null,
  dueDate: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Approval Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // CREATE APPROVAL REQUEST
  // ════════════════════════════════════════════════════════
  describe('createApprovalRequest', () => {
    it('should create a new approval request', async () => {
      mockFindOne.mockResolvedValue(null); // No existing duplicate
      const created = mockModelInstance(mockApproval());
      mockCreate.mockResolvedValue(created);

      const result = await approvalService.createApprovalRequest({
        entityType: 'contract',
        entityId: 'contract-001',
        entityTitle: 'Contract: Ahmed – Al Hilal',
        action: 'review',
        requestedBy: 'user-001',
        assignedRole: 'Manager',
        priority: 'high',
      });

      expect(result).toHaveProperty('id', 'approval-001');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should return existing approval if duplicate found', async () => {
      const existing = mockModelInstance(mockApproval());
      mockFindOne.mockResolvedValue(existing);

      const result = await approvalService.createApprovalRequest({
        entityType: 'contract',
        entityId: 'contract-001',
        entityTitle: 'Contract: Ahmed – Al Hilal',
        action: 'review',
        requestedBy: 'user-001',
      });

      expect(result).toHaveProperty('id', 'approval-001');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should notify by role when assignedRole is set', async () => {
      mockFindOne.mockResolvedValue(null);
      mockCreate.mockResolvedValue(mockModelInstance(mockApproval()));

      await approvalService.createApprovalRequest({
        entityType: 'contract',
        entityId: 'contract-001',
        entityTitle: 'Contract: Ahmed',
        action: 'review',
        requestedBy: 'user-001',
        assignedRole: 'Manager',
      });

      expect(notifyByRole).toHaveBeenCalledWith(
        ['Manager'],
        expect.objectContaining({
          type: 'system',
          title: expect.stringContaining('Approval needed'),
        }),
      );
    });

    it('should notify specific user when assignedTo is set', async () => {
      mockFindOne.mockResolvedValue(null);
      mockCreate.mockResolvedValue(
        mockModelInstance(mockApproval({ assignedTo: 'user-002' })),
      );

      await approvalService.createApprovalRequest({
        entityType: 'contract',
        entityId: 'contract-002',
        entityTitle: 'Contract: Salem',
        action: 'review',
        requestedBy: 'user-001',
        assignedTo: 'user-002',
      });

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-002',
          type: 'system',
        }),
      );
    });

    it('should fallback to Admin/Manager when no assignee specified', async () => {
      mockFindOne.mockResolvedValue(null);
      mockCreate.mockResolvedValue(mockModelInstance(mockApproval({ assignedRole: null })));

      await approvalService.createApprovalRequest({
        entityType: 'payment',
        entityId: 'invoice-001',
        entityTitle: 'Invoice: INV-001',
        action: 'approve_payment',
        requestedBy: 'user-001',
      });

      expect(notifyByRole).toHaveBeenCalledWith(
        ['Admin', 'Manager'],
        expect.objectContaining({ type: 'system' }),
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // LIST APPROVALS
  // ════════════════════════════════════════════════════════
  describe('listApprovalRequests', () => {
    it('should return paginated approvals', async () => {
      mockFindAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockModelInstance(mockApproval())],
      });

      const result = await approvalService.listApprovalRequests(
        { page: 1, limit: 10 },
        'user-001',
        'Admin',
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await approvalService.listApprovalRequests(
        { status: 'Approved' },
        'user-001',
        'Admin',
      );

      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'Approved' }),
        }),
      );
    });

    it('should filter by entityType', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await approvalService.listApprovalRequests(
        { entityType: 'contract' },
        'user-001',
        'Admin',
      );

      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'contract' }),
        }),
      );
    });

    it('should restrict non-admin users to their own requests', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await approvalService.listApprovalRequests(
        {},
        'user-scout-001',
        'Scout',
      );

      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requestedBy: 'user-scout-001' }),
        }),
      );
    });

    it('should search by entityTitle', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await approvalService.listApprovalRequests(
        { search: 'Ahmed' },
        'user-001',
        'Admin',
      );

      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityTitle: expect.objectContaining({
              [Symbol.for('iLike')]: '%Ahmed%',
            }),
          }),
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // STATS
  // ════════════════════════════════════════════════════════
  describe('getApprovalStats', () => {
    it('should return all stat counts', async () => {
      mockCount
        .mockResolvedValueOnce(5)   // pending
        .mockResolvedValueOnce(10)  // approved
        .mockResolvedValueOnce(2)   // rejected
        .mockResolvedValueOnce(1);  // overdue

      const stats = await approvalService.getApprovalStats('user-001', 'Admin');

      expect(stats).toEqual({
        pending: 5,
        approved: 10,
        rejected: 2,
        overdue: 1,
      });
      expect(mockCount).toHaveBeenCalledTimes(4);
    });

    it('should filter by requestedBy for non-admin users', async () => {
      mockCount.mockResolvedValue(0);

      await approvalService.getApprovalStats('user-scout-001', 'Scout');

      // All 4 count calls should include requestedBy filter
      for (const call of mockCount.mock.calls) {
        expect(call[0].where).toHaveProperty('requestedBy', 'user-scout-001');
      }
    });
  });

  // ════════════════════════════════════════════════════════
  // RESOLVE APPROVAL
  // ════════════════════════════════════════════════════════
  describe('resolveApproval', () => {
    it('should approve a pending request', async () => {
      const pending = mockModelInstance(mockApproval({ status: 'Pending' }));
      mockFindByPk.mockResolvedValue(pending);

      const result = await approvalService.resolveApproval(
        'approval-001',
        'user-002',
        'Approved',
        'Looks good',
      );

      expect(pending.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Approved',
          resolvedBy: 'user-002',
          resolvedAt: expect.any(Date),
          comment: 'Looks good',
        }),
      );
    });

    it('should reject a pending request', async () => {
      const pending = mockModelInstance(mockApproval({ status: 'Pending' }));
      mockFindByPk.mockResolvedValue(pending);

      await approvalService.resolveApproval(
        'approval-001',
        'user-002',
        'Rejected',
        'Needs revision',
      );

      expect(pending.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Rejected',
          comment: 'Needs revision',
        }),
      );
    });

    it('should notify the requester after resolution', async () => {
      const pending = mockModelInstance(mockApproval({ status: 'Pending' }));
      mockFindByPk.mockResolvedValue(pending);

      await approvalService.resolveApproval('approval-001', 'user-002', 'Approved');

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001', // requester
          title: expect.stringContaining('approved'),
        }),
      );
    });

    it('should throw if approval not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        approvalService.resolveApproval('nonexistent', 'user-002', 'Approved'),
      ).rejects.toThrow('Approval request not found');
    });

    it('should throw if approval already resolved', async () => {
      const resolved = mockModelInstance(mockApproval({ status: 'Approved' }));
      mockFindByPk.mockResolvedValue(resolved);

      await expect(
        approvalService.resolveApproval('approval-001', 'user-002', 'Rejected'),
      ).rejects.toThrow('Approval already resolved');
    });

    it('should set null comment when not provided', async () => {
      const pending = mockModelInstance(mockApproval({ status: 'Pending' }));
      mockFindByPk.mockResolvedValue(pending);

      await approvalService.resolveApproval('approval-001', 'user-002', 'Approved');

      expect(pending.update).toHaveBeenCalledWith(
        expect.objectContaining({ comment: null }),
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // RESOLVE BY ENTITY
  // ════════════════════════════════════════════════════════
  describe('resolveApprovalByEntity', () => {
    it('should find and resolve matching approval', async () => {
      const pending = mockModelInstance(mockApproval({ status: 'Pending' }));
      mockFindOne.mockResolvedValue(pending);
      mockFindByPk.mockResolvedValue(pending);

      const result = await approvalService.resolveApprovalByEntity(
        'contract',
        'contract-001',
        'user-002',
        'Approved',
      );

      expect(mockFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'contract',
            entityId: 'contract-001',
            status: 'Pending',
          }),
        }),
      );
      expect(pending.update).toHaveBeenCalled();
    });

    it('should return null when no pending approval found', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await approvalService.resolveApprovalByEntity(
        'contract',
        'nonexistent',
        'user-002',
        'Approved',
      );

      expect(result).toBeNull();
    });
  });
});
