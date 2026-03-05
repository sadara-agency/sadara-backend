/// <reference types="jest" />
jest.mock('../../../src/modules/portal/portal.service');
jest.mock('../../../src/modules/documents/document.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/portal/portal.controller';
import * as portalService from '../../../src/modules/portal/portal.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Player', role: 'Player', playerId: 'player-001' },
  ip: '127.0.0.1',
  protocol: 'https',
  get: () => 'localhost',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Portal Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getMyProfile', () => {
    it('should return player profile', async () => {
      (portalService.getMyProfile as jest.Mock).mockResolvedValue({ player: { id: 'p1' }, stats: {} });
      const res = mockRes();
      await controller.getMyProfile(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMySchedule', () => {
    it('should return schedule', async () => {
      (portalService.getMySchedule as jest.Mock).mockResolvedValue({ upcoming: [], past: [], tasks: [] });
      const res = mockRes();
      await controller.getMySchedule(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMyDocuments', () => {
    it('should return player documents', async () => {
      (portalService.getMyDocuments as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getMyDocuments(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMyDevelopment', () => {
    it('should return development data', async () => {
      (portalService.getMyDevelopment as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.getMyDevelopment(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMyStats', () => {
    it('should return player stats', async () => {
      (portalService.getMyStats as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.getMyStats(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMyContracts', () => {
    it('should return contracts', async () => {
      (portalService.getMyContracts as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getMyContracts(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('signMyContract', () => {
    it('should sign contract and audit', async () => {
      (portalService.signMyContract as jest.Mock).mockResolvedValue({ id: 'c1', status: 'Active' });
      const res = mockRes();
      await controller.signMyContract(mockReq({ params: { id: 'c1' }, body: { action: 'sign_digital', signatureData: 'sig' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('generateInvite', () => {
    it('should generate invite and audit', async () => {
      (portalService.generatePlayerInvite as jest.Mock).mockResolvedValue({ inviteLink: 'https://...', token: 'tok' });
      const res = mockRes();
      await controller.generateInvite(mockReq({ body: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateMyProfile', () => {
    it('should update profile and audit', async () => {
      (portalService.updateMyProfile as jest.Mock).mockResolvedValue({ id: 'p1' });
      const res = mockRes();
      await controller.updateMyProfile(mockReq({ body: { phone: '+966501234567' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMyInjuries', () => {
    it('should return injuries', async () => {
      (portalService.getMyInjuries as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getMyInjuries(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('completeRegistration', () => {
    it('should complete registration', async () => {
      (portalService.completePlayerRegistration as jest.Mock).mockResolvedValue({ message: 'Success' });
      const res = mockRes();
      await controller.completeRegistration(mockReq({ body: { token: 'tok', password: 'Pass1234' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
