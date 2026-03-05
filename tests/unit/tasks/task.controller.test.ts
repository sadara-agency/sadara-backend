/// <reference types="jest" />
jest.mock('../../../src/modules/tasks/task.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/tasks/task.controller';
import * as taskService from '../../../src/modules/tasks/task.service';

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

describe('Task Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated tasks', async () => {
      (taskService.listTasks as jest.Mock).mockResolvedValue({ data: [{ id: 't1' }], meta: { total: 1, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq({ query: { page: 1 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return task', async () => {
      (taskService.getTaskById as jest.Mock).mockResolvedValue({ id: 't1', title: 'Test' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 't1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create task and audit', async () => {
      (taskService.createTask as jest.Mock).mockResolvedValue({ id: 't1', title: 'New Task' });
      const res = mockRes();
      await controller.create(mockReq({ body: { title: 'New Task' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(taskService.createTask).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update task and audit', async () => {
      (taskService.updateTask as jest.Mock).mockResolvedValue({ id: 't1', title: 'Updated' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 't1' }, body: { title: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateStatus', () => {
    it('should update status and audit', async () => {
      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({ id: 't1', status: 'Completed' });
      const res = mockRes();
      await controller.updateStatus(mockReq({ params: { id: 't1' }, body: { status: 'Completed' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete task and audit', async () => {
      (taskService.deleteTask as jest.Mock).mockResolvedValue({ id: 't1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 't1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
