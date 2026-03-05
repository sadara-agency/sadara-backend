/// <reference types="jest" />
import { mockAuditLog, mockModelInstance } from '../../setup/test-helpers';

const mockAuditLogFindAndCountAll = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/audit/AuditLog.model', () => ({
  AuditLog: {
    findAndCountAll: (...a: unknown[]) => mockAuditLogFindAndCountAll(...a),
  },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as auditService from '../../../src/modules/audit/audit.service';

describe('Audit Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('listAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      mockAuditLogFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockAuditLog())] });
      const result = await auditService.listAuditLogs({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by entity', async () => {
      mockAuditLogFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await auditService.listAuditLogs({ entity: 'Player', page: 1, limit: 20 });
      expect(mockAuditLogFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockAuditLogFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await auditService.listAuditLogs({ search: 'create', page: 1, limit: 20 });
      expect(mockAuditLogFindAndCountAll).toHaveBeenCalled();
    });
  });
});
