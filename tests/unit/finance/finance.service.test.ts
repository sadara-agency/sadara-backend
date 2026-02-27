// ─────────────────────────────────────────────────────────────
// tests/unit/finance/finance.service.test.ts
// Unit tests for finance service — invoices, payments, ledger.
// ─────────────────────────────────────────────────────────────
import { mockInvoice, mockModelInstance } from '../../setup/test-helpers';

const mockInvoiceFindAndCountAll = jest.fn();
const mockInvoiceFindByPk = jest.fn();
const mockInvoiceCreate = jest.fn();
const mockPaymentFindAndCountAll = jest.fn();
const mockPaymentCreate = jest.fn();
const mockPaymentCount = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([{ total_paid: 100000, total_pending: 50000, total_overdue: 10000, overdue_count: 2, total_invoices: 15 }]),
    authenticate: jest.fn(),
  },
}));

jest.mock('../../../src/modules/finance/finance.model', () => ({
  Invoice: {
    findAndCountAll: (...a: unknown[]) => mockInvoiceFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockInvoiceFindByPk(...a),
    create: (...a: unknown[]) => mockInvoiceCreate(...a),
  },
  Payment: {
    findAndCountAll: (...a: unknown[]) => mockPaymentFindAndCountAll(...a),
    create: (...a: unknown[]) => mockPaymentCreate(...a),
    count: (...a: unknown[]) => mockPaymentCount(...a),
  },
  LedgerEntry: {
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    bulkCreate: jest.fn(),
  },
  Valuation: {
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { name: 'Player', findByPk: jest.fn() },
}));

jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: { name: 'Club' },
}));

jest.mock('../../../src/modules/Users/user.model', () => ({
  User: { name: 'User' },
}));

import * as financeService from '../../../src/modules/finance/finance.service';

describe('Finance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // INVOICES
  // ════════════════════════════════════════════════════════
  describe('listInvoices', () => {
    it('should return paginated invoices', async () => {
      mockInvoiceFindAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockModelInstance(mockInvoice())],
      });

      const result = await financeService.listInvoices({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockInvoiceFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await financeService.listInvoices({ status: 'Paid' });

      expect(mockInvoiceFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'Paid' }),
        }),
      );
    });
  });

  describe('getInvoiceById', () => {
    it('should return invoice with associations', async () => {
      mockInvoiceFindByPk.mockResolvedValue(mockModelInstance(mockInvoice()));

      const result = await financeService.getInvoiceById('invoice-001');

      expect(result).toHaveProperty('id', 'invoice-001');
    });

    it('should throw 404 for non-existent invoice', async () => {
      mockInvoiceFindByPk.mockResolvedValue(null);

      await expect(
        financeService.getInvoiceById('nonexistent'),
      ).rejects.toThrow('Invoice not found');
    });
  });

  describe('updateInvoice', () => {
    it('should reject updates to paid invoices', async () => {
      const paidInvoice = mockModelInstance(mockInvoice({ status: 'Paid' }));
      mockInvoiceFindByPk.mockResolvedValue(paidInvoice);

      await expect(
        financeService.updateInvoice('invoice-001', { description: 'New desc' }),
      ).rejects.toThrow('Cannot modify a paid invoice');
    });
  });

  describe('deleteInvoice', () => {
    it('should reject deletion of paid invoices', async () => {
      const paidInvoice = mockModelInstance(mockInvoice({ status: 'Paid' }));
      mockInvoiceFindByPk.mockResolvedValue(paidInvoice);

      await expect(
        financeService.deleteInvoice('invoice-001'),
      ).rejects.toThrow('Cannot delete a paid invoice');
    });
  });

  // ════════════════════════════════════════════════════════
  // FINANCE SUMMARY
  // ════════════════════════════════════════════════════════
  describe('getFinanceSummary', () => {
    it('should return aggregated finance stats', async () => {
      mockPaymentCount.mockResolvedValue(5);

      const result = await financeService.getFinanceSummary(12);

      expect(result).toHaveProperty('total_paid');
      expect(result).toHaveProperty('upcomingPayments', 5);
    });
  });
});
