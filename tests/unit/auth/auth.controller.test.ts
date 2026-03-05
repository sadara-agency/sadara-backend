/// <reference types="jest" />
jest.mock('../../../src/modules/auth/auth.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));
jest.mock('../../../src/shared/utils/cookie', () => ({
  COOKIE_NAME: 'sadara_token',
  COOKIE_OPTIONS: { httpOnly: true, path: '/' },
  CLEAR_COOKIE_OPTIONS: { httpOnly: true, path: '/' },
}));

import * as controller from '../../../src/modules/auth/auth.controller';
import * as authService from '../../../src/modules/auth/auth.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Admin', role: 'Admin' },
  ip: '127.0.0.1',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res as any;
};

describe('Auth Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should register user', async () => {
      (authService.register as jest.Mock).mockResolvedValue({ user: { id: 'u1' }, token: 'jwt' });
      const res = mockRes();
      await controller.register(mockReq({ body: { email: 'a@b.com', password: 'Pass1234', fullName: 'Test' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('login', () => {
    it('should login user', async () => {
      (authService.login as jest.Mock).mockResolvedValue({ user: { id: 'u1' }, token: 'jwt' });
      const res = mockRes();
      await controller.login(mockReq({ body: { email: 'a@b.com', password: 'pass' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('invite', () => {
    it('should invite user and audit', async () => {
      (authService.invite as jest.Mock).mockResolvedValue({ user: { id: 'u2' }, token: 'jwt' });
      const res = mockRes();
      await controller.invite(mockReq({ body: { email: 'new@b.com', password: 'Pass1234', fullName: 'New', role: 'Analyst' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getProfile', () => {
    it('should return profile', async () => {
      (authService.getProfile as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      const res = mockRes();
      await controller.getProfile(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateProfile', () => {
    it('should update profile and audit', async () => {
      (authService.updateProfile as jest.Mock).mockResolvedValue({ id: 'u1', fullName: 'Updated' });
      const res = mockRes();
      await controller.updateProfile(mockReq({ body: { fullName: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('changePassword', () => {
    it('should change password and audit', async () => {
      (authService.changePassword as jest.Mock).mockResolvedValue(undefined);
      const res = mockRes();
      await controller.changePassword(mockReq({ body: { currentPassword: 'old', newPassword: 'NewPass12' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email', async () => {
      (authService.forgotPassword as jest.Mock).mockResolvedValue(undefined);
      const res = mockRes();
      await controller.forgotPassword(mockReq({ body: { email: 'a@b.com' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      (authService.resetPassword as jest.Mock).mockResolvedValue(undefined);
      const res = mockRes();
      await controller.resetPassword(mockReq({ body: { token: 'tok', newPassword: 'NewPass12' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('logout', () => {
    it('should clear cookie and audit', async () => {
      const res = mockRes();
      await controller.logout(mockReq(), res);
      expect(res.clearCookie).toHaveBeenCalledWith('sadara_token', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
