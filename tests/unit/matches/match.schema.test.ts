import {
  createMatchSchema,
  updateScoreSchema,
  updateMatchStatusSchema,
  matchQuerySchema,
  assignPlayersSchema,
  createMatchAnalysisSchema,
} from '../../../src/modules/matches/match.validation';

const UUID_HOME = '550e8400-e29b-41d4-a716-446655440001';
const UUID_AWAY = '550e8400-e29b-41d4-a716-446655440002';

// Use a date far in the future to satisfy the "today or future" refinement
const FUTURE_DATE = '2099-06-15T18:00:00Z';

describe('Match Schemas', () => {
  describe('createMatchSchema', () => {
    it('should accept valid match', () => {
      expect(createMatchSchema.safeParse({
        homeClubId: UUID_HOME,
        awayClubId: UUID_AWAY,
        matchDate: FUTURE_DATE,
        competition: 'SPL',
      }).success).toBe(true);
    });
    it('should reject missing competition', () => {
      expect(createMatchSchema.safeParse({
        homeClubId: UUID_HOME,
        awayClubId: UUID_AWAY,
        matchDate: FUTURE_DATE,
      }).success).toBe(false);
    });
    it('should reject missing matchDate', () => {
      expect(createMatchSchema.safeParse({
        homeClubId: UUID_HOME,
        awayClubId: UUID_AWAY,
        competition: 'SPL',
      }).success).toBe(false);
    });
    it('should reject missing homeClubId', () => {
      expect(createMatchSchema.safeParse({
        awayClubId: UUID_AWAY,
        matchDate: FUTURE_DATE,
        competition: 'SPL',
      }).success).toBe(false);
    });
    it('should reject missing awayClubId', () => {
      expect(createMatchSchema.safeParse({
        homeClubId: UUID_HOME,
        matchDate: FUTURE_DATE,
        competition: 'SPL',
      }).success).toBe(false);
    });
    it('should reject same home and away club', () => {
      expect(createMatchSchema.safeParse({
        homeClubId: UUID_HOME,
        awayClubId: UUID_HOME,
        matchDate: FUTURE_DATE,
        competition: 'SPL',
      }).success).toBe(false);
    });
    it('should default status to upcoming', () => {
      const result = createMatchSchema.parse({
        homeClubId: UUID_HOME,
        awayClubId: UUID_AWAY,
        matchDate: FUTURE_DATE,
        competition: 'SPL',
      });
      expect(result.status).toBe('upcoming');
    });
    it('should reject negative score', () => {
      expect(createMatchSchema.safeParse({
        homeClubId: UUID_HOME,
        awayClubId: UUID_AWAY,
        matchDate: FUTURE_DATE,
        competition: 'SPL',
        homeScore: -1,
      }).success).toBe(false);
    });
  });

  describe('updateScoreSchema', () => {
    it('should accept valid scores', () => {
      expect(updateScoreSchema.safeParse({ homeScore: 2, awayScore: 1 }).success).toBe(true);
    });
    it('should reject missing awayScore', () => {
      expect(updateScoreSchema.safeParse({ homeScore: 1 }).success).toBe(false);
    });
    it('should accept optional status', () => {
      expect(updateScoreSchema.safeParse({ homeScore: 3, awayScore: 0, status: 'completed' }).success).toBe(true);
    });
  });

  describe('updateMatchStatusSchema', () => {
    it('should accept valid status', () => {
      expect(updateMatchStatusSchema.safeParse({ status: 'live' }).success).toBe(true);
    });
    it('should reject invalid status', () => {
      expect(updateMatchStatusSchema.safeParse({ status: 'postponed' }).success).toBe(false);
    });
  });

  describe('matchQuerySchema', () => {
    it('should default sort to match_date', () => {
      expect(matchQuerySchema.parse({}).sort).toBe('match_date');
    });
    it('should default order to desc', () => {
      expect(matchQuerySchema.parse({}).order).toBe('desc');
    });
  });

  describe('assignPlayersSchema', () => {
    it('should accept valid player list', () => {
      expect(assignPlayersSchema.safeParse({ players: [{ playerId: UUID_HOME }] }).success).toBe(true);
    });
    it('should reject empty player list', () => {
      expect(assignPlayersSchema.safeParse({ players: [] }).success).toBe(false);
    });
    it('should default availability to starter', () => {
      const result = assignPlayersSchema.parse({ players: [{ playerId: UUID_HOME }] });
      expect(result.players[0].availability).toBe('starter');
    });
  });

  describe('createMatchAnalysisSchema', () => {
    it('should accept valid analysis', () => {
      expect(createMatchAnalysisSchema.safeParse({ type: 'pre-match', title: 'Analysis', content: 'Details' }).success).toBe(true);
    });
    it('should reject invalid type', () => {
      expect(createMatchAnalysisSchema.safeParse({ type: 'mid-match', title: 'A', content: 'B' }).success).toBe(false);
    });
  });
});
