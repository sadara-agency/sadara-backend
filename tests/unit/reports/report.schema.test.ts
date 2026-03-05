import {
  createReportSchema,
  reportQuerySchema,
} from '../../../src/modules/reports/report.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Report Schemas', () => {
  describe('createReportSchema', () => {
    const valid = { playerId: UUID, title: 'Season Report', periodType: 'Season' as const };

    it('should accept valid report', () => {
      expect(createReportSchema.safeParse(valid).success).toBe(true);
    });
    it('should reject missing title', () => {
      expect(createReportSchema.safeParse({ ...valid, title: undefined }).success).toBe(false);
    });
    it('should reject invalid periodType', () => {
      expect(createReportSchema.safeParse({ ...valid, periodType: 'Weekly' }).success).toBe(false);
    });
    it('should default periodParams to empty object', () => {
      expect(createReportSchema.parse(valid).periodParams).toEqual({});
    });
    it('should reject invalid UUID', () => {
      expect(createReportSchema.safeParse({ ...valid, playerId: 'bad' }).success).toBe(false);
    });
  });

  describe('reportQuerySchema', () => {
    it('should default page and limit', () => {
      const result = reportQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
    it('should accept status filter', () => {
      expect(reportQuerySchema.safeParse({ status: 'Generated' }).success).toBe(true);
    });
    it('should reject invalid status', () => {
      expect(reportQuerySchema.safeParse({ status: 'Complete' }).success).toBe(false);
    });
  });
});
