import {
  createWatchlistSchema,
  updateWatchlistStatusSchema,
  watchlistQuerySchema,
  createScreeningSchema,
  markPackReadySchema,
  createDecisionSchema,
} from '../../../src/modules/scouting/scouting.validation';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

// Minimum valid watchlist input — position and currentClub are now required
const VALID_WATCHLIST = { prospectName: 'Ahmed Ali', position: 'ST', currentClub: 'Al Hilal' };

describe('Scouting Schemas', () => {
  describe('createWatchlistSchema', () => {
    it('should accept valid prospect', () => {
      expect(createWatchlistSchema.safeParse(VALID_WATCHLIST).success).toBe(true);
    });
    it('should reject empty name', () => {
      expect(createWatchlistSchema.safeParse({ ...VALID_WATCHLIST, prospectName: '' }).success).toBe(false);
    });
    it('should default priority to Medium', () => {
      expect(createWatchlistSchema.parse(VALID_WATCHLIST).priority).toBe('Medium');
    });
    it('should default videoClips to 0', () => {
      expect(createWatchlistSchema.parse(VALID_WATCHLIST).videoClips).toBe(0);
    });
    it('should reject rating > 10', () => {
      expect(createWatchlistSchema.safeParse({ ...VALID_WATCHLIST, technicalRating: 11 }).success).toBe(false);
    });
  });

  describe('updateWatchlistStatusSchema', () => {
    it('should accept valid status', () => {
      expect(updateWatchlistStatusSchema.safeParse({ status: 'Shortlisted' }).success).toBe(true);
    });
    it('should reject invalid status', () => {
      expect(updateWatchlistStatusSchema.safeParse({ status: 'Deleted' }).success).toBe(false);
    });
  });

  describe('createScreeningSchema', () => {
    it('should accept valid screening', () => {
      expect(createScreeningSchema.safeParse({ watchlistId: UUID }).success).toBe(true);
    });
    it('should reject invalid UUID', () => {
      expect(createScreeningSchema.safeParse({ watchlistId: 'bad' }).success).toBe(false);
    });
  });

  describe('markPackReadySchema', () => {
    it('should accept true', () => {
      expect(markPackReadySchema.safeParse({ isPackReady: true }).success).toBe(true);
    });
    it('should reject false', () => {
      expect(markPackReadySchema.safeParse({ isPackReady: false }).success).toBe(false);
    });
  });

  describe('createDecisionSchema', () => {
    const valid = { screeningCaseId: UUID, committeeName: 'Board', decision: 'Approved' as const };

    it('should accept valid decision', () => {
      expect(createDecisionSchema.safeParse(valid).success).toBe(true);
    });
    it('should reject invalid decision', () => {
      expect(createDecisionSchema.safeParse({ ...valid, decision: 'Maybe' }).success).toBe(false);
    });
    it('should default decisionScope to Full', () => {
      expect(createDecisionSchema.parse(valid).decisionScope).toBe('Full');
    });
    it('should default vote counts to 0', () => {
      const result = createDecisionSchema.parse(valid);
      expect(result.votesFor).toBe(0);
      expect(result.votesAgainst).toBe(0);
      expect(result.votesAbstain).toBe(0);
    });
  });
});
