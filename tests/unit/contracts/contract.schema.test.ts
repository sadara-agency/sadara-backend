// ─────────────────────────────────────────────────────────────
// tests/unit/contracts/contract.schema.test.ts
// Validates Zod schemas reject bad input and accept good input.
// ─────────────────────────────────────────────────────────────
import {
  createContractSchema,
  updateContractSchema,
  contractQuerySchema,
} from '../../../src/modules/contracts/contract.schema';

describe('Contract Schemas', () => {
  describe('createContractSchema', () => {
    const validInput = {
      playerId: '550e8400-e29b-41d4-a716-446655440001',
      clubId: '550e8400-e29b-41d4-a716-446655440002',
      startDate: '2024-01-01',
      endDate: '2026-01-01',
      baseSalary: 500000,
      commissionPct: 10,
    };

    it('should accept valid contract input', () => {
      const result = createContractSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for playerId', () => {
      const result = createContractSchema.safeParse({
        ...validInput,
        playerId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject endDate before startDate', () => {
      const result = createContractSchema.safeParse({
        ...validInput,
        startDate: '2026-01-01',
        endDate: '2024-01-01',
      });
      expect(result.success).toBe(false);
    });

    it('should reject commission > 100%', () => {
      const result = createContractSchema.safeParse({
        ...validInput,
        commissionPct: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = createContractSchema.safeParse({
        ...validInput,
        startDate: '01/01/2024',
      });
      expect(result.success).toBe(false);
    });

    it('should default category to Club', () => {
      const result = createContractSchema.parse(validInput);
      expect(result.category).toBe('Club');
    });
  });

  describe('updateContractSchema', () => {
    it('should accept partial updates', () => {
      const result = updateContractSchema.safeParse({
        baseSalary: 600000,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object (no changes)', () => {
      const result = updateContractSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = updateContractSchema.safeParse({
        status: 'InvalidStatus',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('contractQuerySchema', () => {
    it('should coerce string page to number', () => {
      const result = contractQuerySchema.parse({ page: '3' });
      expect(result.page).toBe(3);
      expect(typeof result.page).toBe('number');
    });

    it('should default sort to created_at', () => {
      const result = contractQuerySchema.parse({});
      expect(result.sort).toBe('created_at');
    });

    it('should reject invalid UUID in playerId', () => {
      const result = contractQuerySchema.safeParse({
        playerId: 'not-uuid',
      });
      expect(result.success).toBe(false);
    });
  });
});
