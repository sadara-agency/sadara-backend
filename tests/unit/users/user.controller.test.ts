/// <reference types="jest" />
jest.mock('../../../src/modules/Users/user.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/Users/user.controller';
import * as userService from '../../../src/modules/Users/user.service';

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

describe('User Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated users', async () => {
      (userService.listUsers as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return user', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'u1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create user and audit', async () => {
      (userService.createUser as jest.Mock).mockResolvedValue({ id: 'u2', email: 'new@b.com' });
      const res = mockRes();
      await controller.create(mockReq({ body: { email: 'new@b.com', password: 'Pass1234', fullName: 'New' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update user and audit', async () => {
      (userService.updateUser as jest.Mock).mockResolvedValue({ id: 'u1', fullName: 'Updated' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'u1' }, body: { fullName: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resetPassword', () => {
    it('should reset password and audit', async () => {
      (userService.resetPassword as jest.Mock).mockResolvedValue(undefined);
      const res = mockRes();
      await controller.resetPassword(mockReq({ params: { id: 'u1' }, body: { newPassword: 'NewPass12' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete user and audit', async () => {
      (userService.deleteUser as jest.Mock).mockResolvedValue({ id: 'u1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'u1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
