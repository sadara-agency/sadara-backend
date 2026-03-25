import {
  createMediaRequestSchema,
  updateMediaRequestSchema,
  updateMediaRequestStatusSchema,
  mediaRequestQuerySchema,
} from '../../../../src/modules/media/media-requests/mediaRequest.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Media Request Schemas', () => {
  describe('createMediaRequestSchema', () => {
    const valid = {
      journalistName: 'John Doe',
      outlet: 'BBC Sport',
      subject: 'Transfer rumours',
    };

    it('should accept valid minimal input', () => {
      expect(createMediaRequestSchema.safeParse(valid).success).toBe(true);
    });

    it('should apply defaults for requestType and priority', () => {
      const result = createMediaRequestSchema.parse(valid);
      expect(result.requestType).toBe('interview');
      expect(result.priority).toBe('normal');
    });

    it('should accept full input with all optional fields', () => {
      const full = {
        ...valid,
        journalistNameAr: 'جون دو',
        outletAr: 'بي بي سي سبورت',
        journalistEmail: 'john@bbc.com',
        journalistPhone: '+44123456789',
        requestType: 'press_conference' as const,
        subjectAr: 'شائعات الانتقالات',
        description: 'Details about the request',
        descriptionAr: 'تفاصيل عن الطلب',
        playerId: UUID,
        clubId: UUID,
        matchId: UUID,
        priority: 'high' as const,
        deadline: '2026-04-01T12:00:00+00:00',
        scheduledAt: '2026-04-02T10:00:00+00:00',
        notes: 'Some notes',
        assignedTo: UUID,
      };
      expect(createMediaRequestSchema.safeParse(full).success).toBe(true);
    });

    it('should reject missing journalistName', () => {
      expect(createMediaRequestSchema.safeParse({ outlet: 'BBC', subject: 'Test' }).success).toBe(false);
    });

    it('should reject missing outlet', () => {
      expect(createMediaRequestSchema.safeParse({ journalistName: 'John', subject: 'Test' }).success).toBe(false);
    });

    it('should reject missing subject', () => {
      expect(createMediaRequestSchema.safeParse({ journalistName: 'John', outlet: 'BBC' }).success).toBe(false);
    });

    it('should reject invalid email', () => {
      expect(createMediaRequestSchema.safeParse({ ...valid, journalistEmail: 'not-email' }).success).toBe(false);
    });

    it('should reject invalid requestType', () => {
      expect(createMediaRequestSchema.safeParse({ ...valid, requestType: 'invalid' }).success).toBe(false);
    });

    it('should reject invalid priority', () => {
      expect(createMediaRequestSchema.safeParse({ ...valid, priority: 'critical' }).success).toBe(false);
    });

    it('should reject invalid UUID for playerId', () => {
      expect(createMediaRequestSchema.safeParse({ ...valid, playerId: 'bad' }).success).toBe(false);
    });

    it('should reject invalid datetime for deadline', () => {
      expect(createMediaRequestSchema.safeParse({ ...valid, deadline: 'not-a-date' }).success).toBe(false);
    });
  });

  describe('updateMediaRequestSchema', () => {
    it('should accept partial updates', () => {
      expect(updateMediaRequestSchema.safeParse({ subject: 'Updated subject' }).success).toBe(true);
    });

    it('should accept empty object', () => {
      expect(updateMediaRequestSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('updateMediaRequestStatusSchema', () => {
    it('should accept valid status', () => {
      expect(updateMediaRequestStatusSchema.safeParse({ status: 'approved' }).success).toBe(true);
    });

    it('should accept status with decline reason', () => {
      expect(updateMediaRequestStatusSchema.safeParse({ status: 'declined', declineReason: 'Not available' }).success).toBe(true);
    });

    it('should reject invalid status', () => {
      expect(updateMediaRequestStatusSchema.safeParse({ status: 'invalid' }).success).toBe(false);
    });
  });

  describe('mediaRequestQuerySchema', () => {
    it('should default page, limit, sort, order', () => {
      const result = mediaRequestQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sort).toBe('created_at');
      expect(result.order).toBe('desc');
    });

    it('should accept valid filters', () => {
      const result = mediaRequestQuerySchema.parse({
        status: 'pending',
        requestType: 'interview',
        priority: 'high',
        playerId: UUID,
        assignedTo: UUID,
        search: 'test',
      });
      expect(result.status).toBe('pending');
      expect(result.requestType).toBe('interview');
    });

    it('should coerce string page/limit to numbers', () => {
      const result = mediaRequestQuerySchema.parse({ page: '3', limit: '50' });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });
  });
});
