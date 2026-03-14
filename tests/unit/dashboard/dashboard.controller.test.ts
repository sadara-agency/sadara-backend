/// <reference types="jest" />
jest.mock('../../../src/modules/dashboard/dashboard.service');

import * as controller from '../../../src/modules/dashboard/dashboard.controller';
import * as svc from '../../../src/modules/dashboard/dashboard.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Admin', role: 'Admin' },
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Dashboard Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getKpis', async () => {
    (svc.getKpis as jest.Mock).mockResolvedValue({});
    const res = mockRes();
    await controller.getKpis(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getAlerts', async () => {
    (svc.getAlerts as jest.Mock).mockResolvedValue([]);
    const res = mockRes();
    await controller.getAlerts(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getTodayOverview', async () => {
    (svc.getTodayOverview as jest.Mock).mockResolvedValue({});
    const res = mockRes();
    await controller.getTodayOverview(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getTopPlayers with default limit', async () => {
    (svc.getTopPlayers as jest.Mock).mockResolvedValue([]);
    const res = mockRes();
    await controller.getTopPlayers(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getContractStatus', async () => {
    (svc.getContractStatusDistribution as jest.Mock).mockResolvedValue({});
    const res = mockRes();
    await controller.getContractStatus(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getPlayerDistribution', async () => {
    (svc.getPlayerDistribution as jest.Mock).mockResolvedValue({});
    const res = mockRes();
    await controller.getPlayerDistribution(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getRecentOffers', async () => {
    (svc.getRecentOffers as jest.Mock).mockResolvedValue([]);
    const res = mockRes();
    await controller.getRecentOffers(mockReq({ query: { limit: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getUpcomingMatches', async () => {
    (svc.getUpcomingMatches as jest.Mock).mockResolvedValue([]);
    const res = mockRes();
    await controller.getUpcomingMatches(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getUrgentTasks', async () => {
    (svc.getUrgentTasks as jest.Mock).mockResolvedValue([]);
    const res = mockRes();
    await controller.getUrgentTasks(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getRevenueChart', async () => {
    (svc.getRevenueChart as jest.Mock).mockResolvedValue([]);
    const res = mockRes();
    await controller.getRevenueChart(mockReq({ query: { months: '6' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getPerformanceAverages', async () => {
    (svc.getPerformanceAverages as jest.Mock).mockResolvedValue({});
    const res = mockRes();
    await controller.getPerformanceAverages(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getRecentActivity', async () => {
    (svc.getRecentActivity as jest.Mock).mockResolvedValue([]);
    const res = mockRes();
    await controller.getRecentActivity(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getQuickStats', async () => {
    (svc.getQuickStats as jest.Mock).mockResolvedValue({});
    const res = mockRes();
    await controller.getQuickStats(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getOfferPipeline', async () => {
    (svc.getOfferPipeline as jest.Mock).mockResolvedValue({});
    const res = mockRes();
    await controller.getOfferPipeline(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getInjuryTrends', async () => {
    (svc.getInjuryTrends as jest.Mock).mockResolvedValue({});
    const res = mockRes();
    await controller.getInjuryTrends(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getKpiTrends', async () => {
    (svc.getKpiTrends as jest.Mock).mockResolvedValue({});
    const res = mockRes();
    await controller.getKpiTrends(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
