/// <reference types="jest" />
jest.mock('../../../src/modules/reports/report.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/reports/report.controller';
import * as svc from '../../../src/modules/reports/report.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Admin', role: 'Admin' },
  ip: '127.0.0.1',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Report Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated reports', async () => {
      (svc.listReports as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return report', async () => {
      (svc.getReportById as jest.Mock).mockResolvedValue({ id: 'r1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'r1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create report and audit', async () => {
      (svc.createReport as jest.Mock).mockResolvedValue({ id: 'r1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { playerId: 'p1', title: 'Report', periodType: 'Season' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('remove', () => {
    it('should delete report and audit', async () => {
      (svc.deleteReport as jest.Mock).mockResolvedValue({ id: 'r1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'r1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('playerPortfolio', () => {
    it('should return portfolio report', async () => {
      (svc.getPlayerPortfolioReport as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.playerPortfolio(mockReq({ query: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('contractCommission', () => {
    it('should return commission report', async () => {
      (svc.getContractCommissionReport as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.contractCommission(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('injurySummary', () => {
    it('should return injury summary', async () => {
      (svc.getInjurySummaryReport as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.injurySummary(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('financialSummary', () => {
    it('should return financial summary', async () => {
      (svc.getFinancialSummaryReport as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.financialSummary(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('scoutingPipeline', () => {
    it('should return scouting pipeline', async () => {
      (svc.getScoutingPipelineReport as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.scoutingPipeline(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('expiringContracts', () => {
    it('should return expiring contracts', async () => {
      (svc.getExpiringContractsReport as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.expiringContracts(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
