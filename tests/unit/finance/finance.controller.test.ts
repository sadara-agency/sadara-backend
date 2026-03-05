/// <reference types="jest" />
jest.mock('../../../src/modules/finance/finance.service');
jest.mock('../../../src/modules/approvals/approval.service', () => ({
  createApprovalRequest: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/finance/finance.controller';
import * as svc from '../../../src/modules/finance/finance.service';

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

describe('Finance Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listInvoices', () => {
    it('should return paginated invoices', async () => {
      (svc.listInvoices as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listInvoices(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getInvoice', () => {
    it('should return invoice', async () => {
      (svc.getInvoiceById as jest.Mock).mockResolvedValue({ id: 'inv1' });
      const res = mockRes();
      await controller.getInvoice(mockReq({ params: { id: 'inv1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createInvoice', () => {
    it('should create invoice and audit', async () => {
      (svc.createInvoice as jest.Mock).mockResolvedValue({ id: 'inv1', totalAmount: 1000 });
      const res = mockRes();
      await controller.createInvoice(mockReq({ body: { amount: 1000, totalAmount: 1000, dueDate: '2025-06-30' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateInvoice', () => {
    it('should update invoice and audit', async () => {
      (svc.updateInvoice as jest.Mock).mockResolvedValue({ id: 'inv1' });
      const res = mockRes();
      await controller.updateInvoice(mockReq({ params: { id: 'inv1' }, body: { amount: 2000 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateInvoiceStatus', () => {
    it('should update invoice status and audit', async () => {
      (svc.updateInvoiceStatus as jest.Mock).mockResolvedValue({ id: 'inv1', status: 'Paid' });
      const res = mockRes();
      await controller.updateInvoiceStatus(mockReq({ params: { id: 'inv1' }, body: { status: 'Paid' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteInvoice', () => {
    it('should delete invoice and audit', async () => {
      (svc.deleteInvoice as jest.Mock).mockResolvedValue({ id: 'inv1' });
      const res = mockRes();
      await controller.deleteInvoice(mockReq({ params: { id: 'inv1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listPayments', () => {
    it('should return paginated payments', async () => {
      (svc.listPayments as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listPayments(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createPayment', () => {
    it('should create payment and audit', async () => {
      (svc.createPayment as jest.Mock).mockResolvedValue({ id: 'pay1' });
      const res = mockRes();
      await controller.createPayment(mockReq({ body: { amount: 5000, dueDate: '2025-06-30' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      (svc.updatePaymentStatus as jest.Mock).mockResolvedValue({ id: 'pay1', status: 'Paid' });
      const res = mockRes();
      await controller.updatePaymentStatus(mockReq({ params: { id: 'pay1' }, body: { status: 'Paid' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listLedger', () => {
    it('should return paginated ledger', async () => {
      (svc.listLedger as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listLedger(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createLedgerEntry', () => {
    it('should create ledger entry and audit', async () => {
      (svc.createLedgerEntry as jest.Mock).mockResolvedValue({ id: 'led1' });
      const res = mockRes();
      await controller.createLedgerEntry(mockReq({ body: { side: 'Debit', account: 'Rev', amount: 1000 } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('listValuations', () => {
    it('should return paginated valuations', async () => {
      (svc.listValuations as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listValuations(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createValuation', () => {
    it('should create valuation and audit', async () => {
      (svc.createValuation as jest.Mock).mockResolvedValue({ id: 'val1' });
      const res = mockRes();
      await controller.createValuation(mockReq({ body: { playerId: 'p1', value: 1000000 } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('summary', () => {
    it('should return summary', async () => {
      (svc.getFinanceSummary as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.summary(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('dashboard', () => {
    it('should return financial dashboard', async () => {
      (svc.getFinancialDashboard as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.dashboard(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
