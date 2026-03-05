import {
  createGateSchema,
  updateGateSchema,
  advanceGateSchema,
  initializeGateSchema,
  createChecklistItemSchema,
  toggleChecklistItemSchema,
  gateQuerySchema,
} from '../../../src/modules/gates/gate.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Gate Schemas', () => {
  describe('createGateSchema', () => {
    it('should accept valid gate', () => {
      expect(createGateSchema.safeParse({ playerId: UUID, gateNumber: '1' }).success).toBe(true);
    });
    it('should reject invalid gateNumber', () => {
      expect(createGateSchema.safeParse({ playerId: UUID, gateNumber: '5' }).success).toBe(false);
    });
    it('should default status to Pending', () => {
      expect(createGateSchema.parse({ playerId: UUID, gateNumber: '0' }).status).toBe('Pending');
    });
  });

  describe('advanceGateSchema', () => {
    it('should accept start action', () => {
      expect(advanceGateSchema.safeParse({ action: 'start' }).success).toBe(true);
    });
    it('should accept complete action', () => {
      expect(advanceGateSchema.safeParse({ action: 'complete' }).success).toBe(true);
    });
    it('should reject invalid action', () => {
      expect(advanceGateSchema.safeParse({ action: 'skip' }).success).toBe(false);
    });
  });

  describe('initializeGateSchema', () => {
    it('should accept valid input', () => {
      expect(initializeGateSchema.safeParse({ playerId: UUID, gateNumber: '2' }).success).toBe(true);
    });
    it('should default autoStart to false', () => {
      expect(initializeGateSchema.parse({ playerId: UUID, gateNumber: '0' }).autoStart).toBe(false);
    });
  });

  describe('createChecklistItemSchema', () => {
    it('should accept valid item', () => {
      expect(createChecklistItemSchema.safeParse({ item: 'Medical check' }).success).toBe(true);
    });
    it('should reject empty item', () => {
      expect(createChecklistItemSchema.safeParse({ item: '' }).success).toBe(false);
    });
    it('should default isMandatory to true', () => {
      expect(createChecklistItemSchema.parse({ item: 'Test' }).isMandatory).toBe(true);
    });
  });

  describe('toggleChecklistItemSchema', () => {
    it('should accept boolean isCompleted', () => {
      expect(toggleChecklistItemSchema.safeParse({ isCompleted: true }).success).toBe(true);
    });
    it('should reject missing isCompleted', () => {
      expect(toggleChecklistItemSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('gateQuerySchema', () => {
    it('should default sort to gate_number', () => {
      expect(gateQuerySchema.parse({}).sort).toBe('gate_number');
    });
    it('should default order to asc', () => {
      expect(gateQuerySchema.parse({}).order).toBe('asc');
    });
  });
});
