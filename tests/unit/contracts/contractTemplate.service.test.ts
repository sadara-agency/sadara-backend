// ─────────────────────────────────────────────────────────────
// tests/unit/contracts/contractTemplate.service.test.ts
// Unit tests for contract template service.
// ─────────────────────────────────────────────────────────────
import { mockModelInstance } from '../../setup/test-helpers';

// ── Mock data factory ──

const mockContractTemplate = (overrides: Record<string, any> = {}) => ({
  id: 'template-001',
  name: 'Standard Representation',
  nameAr: 'تمثيل قياسي',
  contractType: 'Representation',
  category: 'Club',
  defaultValues: { commissionPct: 10, salaryCurrency: 'SAR' },
  isActive: true,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// ── Mock Sequelize and models ──

const mockFindAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
    authenticate: jest.fn(),
  },
}));

jest.mock('../../../src/modules/contracts/contractTemplate.model', () => ({
  ContractTemplate: {
    findAll: (...args: unknown[]) => mockFindAll(...args),
    findByPk: (...args: unknown[]) => mockFindByPk(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

import * as service from '../../../src/modules/contracts/contractTemplate.service';

describe('ContractTemplate Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // LIST CONTRACT TEMPLATES
  // ════════════════════════════════════════════════════════
  describe('listContractTemplates', () => {
    it('should return all templates ordered by contractType then name', async () => {
      const templates = [
        mockModelInstance(mockContractTemplate()),
        mockModelInstance(mockContractTemplate({ id: 'template-002', name: 'Loan Agreement' })),
      ];
      mockFindAll.mockResolvedValue(templates);

      const result = await service.listContractTemplates();

      expect(result).toHaveLength(2);
      expect(mockFindAll).toHaveBeenCalledTimes(1);
      expect(mockFindAll).toHaveBeenCalledWith({
        order: [
          ['contractType', 'ASC'],
          ['name', 'ASC'],
        ],
      });
    });

    it('should return empty array when no templates exist', async () => {
      mockFindAll.mockResolvedValue([]);

      const result = await service.listContractTemplates();

      expect(result).toEqual([]);
      expect(mockFindAll).toHaveBeenCalledTimes(1);
    });
  });

  // ════════════════════════════════════════════════════════
  // GET CONTRACT TEMPLATE
  // ════════════════════════════════════════════════════════
  describe('getContractTemplate', () => {
    it('should return a template by id', async () => {
      const template = mockModelInstance(mockContractTemplate());
      mockFindByPk.mockResolvedValue(template);

      const result = await service.getContractTemplate('template-001');

      expect(result).toEqual(template);
      expect(mockFindByPk).toHaveBeenCalledWith('template-001');
    });

    it('should throw 404 for non-existent template', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        service.getContractTemplate('nonexistent'),
      ).rejects.toThrow('Contract template not found');
    });

    it('should throw AppError with status 404', async () => {
      mockFindByPk.mockResolvedValue(null);

      try {
        await service.getContractTemplate('nonexistent');
        fail('Expected error to be thrown');
      } catch (err: any) {
        expect(err.statusCode).toBe(404);
      }
    });
  });

  // ════════════════════════════════════════════════════════
  // CREATE CONTRACT TEMPLATE
  // ════════════════════════════════════════════════════════
  describe('createContractTemplate', () => {
    it('should create a template with all fields', async () => {
      const input = {
        name: 'Transfer Agreement',
        nameAr: 'اتفاقية نقل',
        contractType: 'Transfer' as const,
        category: 'Club' as const,
        defaultValues: { baseSalary: 500000, salaryCurrency: 'SAR' as const },
      };
      const created = mockModelInstance(mockContractTemplate({ ...input, id: 'template-new' }));
      mockCreate.mockResolvedValue(created);

      const result = await service.createContractTemplate(input, 'user-001');

      expect(result).toEqual(created);
      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Transfer Agreement',
        nameAr: 'اتفاقية نقل',
        contractType: 'Transfer',
        category: 'Club',
        defaultValues: { baseSalary: 500000, salaryCurrency: 'SAR' },
        createdBy: 'user-001',
      });
    });

    it('should default nameAr to null when not provided', async () => {
      const input = {
        name: 'Loan Template',
        contractType: 'Loan' as const,
        category: 'Club' as const,
        defaultValues: {},
      };
      mockCreate.mockResolvedValue(mockModelInstance(mockContractTemplate()));

      await service.createContractTemplate(input);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          nameAr: null,
        }),
      );
    });

    it('should default defaultValues to empty object when not provided', async () => {
      mockCreate.mockResolvedValue(mockModelInstance(mockContractTemplate()));

      await service.createContractTemplate({
        name: 'Minimal Template',
        contractType: 'Representation',
        category: 'Club',
      } as any);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValues: {},
        }),
      );
    });

    it('should default createdBy to null when userId not provided', async () => {
      const input = {
        name: 'No User Template',
        contractType: 'Sponsorship' as const,
        category: 'Sponsorship' as const,
        defaultValues: {},
      };
      mockCreate.mockResolvedValue(mockModelInstance(mockContractTemplate()));

      await service.createContractTemplate(input);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: null,
        }),
      );
    });

    it('should pass userId as createdBy', async () => {
      const input = {
        name: 'With User',
        contractType: 'Renewal' as const,
        category: 'Club' as const,
        defaultValues: {},
      };
      mockCreate.mockResolvedValue(mockModelInstance(mockContractTemplate()));

      await service.createContractTemplate(input, 'user-999');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'user-999',
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE CONTRACT TEMPLATE
  // ════════════════════════════════════════════════════════
  describe('updateContractTemplate', () => {
    it('should update name only', async () => {
      const data = mockContractTemplate();
      const instance = mockModelInstance(data) as any;
      instance.save = jest.fn().mockResolvedValue(instance);
      mockFindByPk.mockResolvedValue(instance);

      const result = await service.updateContractTemplate('template-001', {
        name: 'Updated Name',
      });

      expect(instance.name).toBe('Updated Name');
      expect(instance.save).toHaveBeenCalled();
      expect(result).toEqual(instance);
    });

    it('should update multiple fields', async () => {
      const data = mockContractTemplate();
      const instance = mockModelInstance(data) as any;
      instance.save = jest.fn().mockResolvedValue(instance);
      mockFindByPk.mockResolvedValue(instance);

      await service.updateContractTemplate('template-001', {
        name: 'New Name',
        nameAr: 'اسم جديد',
        contractType: 'Loan',
        category: 'Sponsorship',
        defaultValues: { commissionPct: 15 },
        isActive: false,
      });

      expect(instance.name).toBe('New Name');
      expect(instance.nameAr).toBe('اسم جديد');
      expect(instance.contractType).toBe('Loan');
      expect(instance.category).toBe('Sponsorship');
      expect(instance.defaultValues).toEqual({ commissionPct: 15 });
      expect(instance.isActive).toBe(false);
      expect(instance.save).toHaveBeenCalledTimes(1);
    });

    it('should not modify fields that are not in the input', async () => {
      const data = mockContractTemplate();
      const instance = mockModelInstance(data) as any;
      instance.save = jest.fn().mockResolvedValue(instance);
      mockFindByPk.mockResolvedValue(instance);

      await service.updateContractTemplate('template-001', {
        name: 'Only Name Changed',
      });

      // Original values should be preserved
      expect(instance.contractType).toBe('Representation');
      expect(instance.category).toBe('Club');
      expect(instance.isActive).toBe(true);
    });

    it('should throw 404 for non-existent template', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        service.updateContractTemplate('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow('Contract template not found');
    });

    it('should throw AppError with status 404 on update', async () => {
      mockFindByPk.mockResolvedValue(null);

      try {
        await service.updateContractTemplate('nonexistent', { name: 'X' });
        fail('Expected error to be thrown');
      } catch (err: any) {
        expect(err.statusCode).toBe(404);
      }
    });

    it('should handle empty update input without error', async () => {
      const data = mockContractTemplate();
      const instance = mockModelInstance(data) as any;
      instance.save = jest.fn().mockResolvedValue(instance);
      mockFindByPk.mockResolvedValue(instance);

      const result = await service.updateContractTemplate('template-001', {});

      expect(instance.save).toHaveBeenCalled();
      expect(result).toEqual(instance);
    });
  });

  // ════════════════════════════════════════════════════════
  // DEACTIVATE CONTRACT TEMPLATE
  // ════════════════════════════════════════════════════════
  describe('deactivateContractTemplate', () => {
    it('should set isActive to false', async () => {
      const data = mockContractTemplate({ isActive: true });
      const instance = mockModelInstance(data);
      mockFindByPk.mockResolvedValue(instance);

      const result = await service.deactivateContractTemplate('template-001');

      expect(instance.update).toHaveBeenCalledWith({ isActive: false });
      expect(result).toEqual(instance);
    });

    it('should throw 404 for non-existent template', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        service.deactivateContractTemplate('nonexistent'),
      ).rejects.toThrow('Contract template not found');
    });

    it('should throw AppError with status 404 on deactivate', async () => {
      mockFindByPk.mockResolvedValue(null);

      try {
        await service.deactivateContractTemplate('nonexistent');
        fail('Expected error to be thrown');
      } catch (err: any) {
        expect(err.statusCode).toBe(404);
      }
    });

    it('should deactivate an already inactive template without error', async () => {
      const data = mockContractTemplate({ isActive: false });
      const instance = mockModelInstance(data);
      mockFindByPk.mockResolvedValue(instance);

      await service.deactivateContractTemplate('template-001');

      expect(instance.update).toHaveBeenCalledWith({ isActive: false });
    });
  });
});
