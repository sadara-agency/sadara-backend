/**
 * @swagger
 * components:
 *   schemas:
 *     RatedItem:
 *       type: object
 *       required: [rating]
 *       properties:
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: "1=Weak, 2=Acceptable, 3=Good, 4=VeryGood, 5=Excellent"
 *         note:
 *           type: string
 *           nullable: true
 *           maxLength: 500
 *
 *     FitnessScores:
 *       type: object
 *       properties:
 *         strength: { $ref: '#/components/schemas/RatedItem' }
 *         speed: { $ref: '#/components/schemas/RatedItem' }
 *         agility: { $ref: '#/components/schemas/RatedItem' }
 *         flexibility: { $ref: '#/components/schemas/RatedItem' }
 *         endurance: { $ref: '#/components/schemas/RatedItem' }
 *
 *     TechnicalScores:
 *       type: object
 *       properties:
 *         dribbling: { $ref: '#/components/schemas/RatedItem' }
 *         passing: { $ref: '#/components/schemas/RatedItem' }
 *         insideKick: { $ref: '#/components/schemas/RatedItem' }
 *         outsideKick: { $ref: '#/components/schemas/RatedItem' }
 *         trappingAndReceiving: { $ref: '#/components/schemas/RatedItem' }
 *         heading: { $ref: '#/components/schemas/RatedItem' }
 *         chestControl: { $ref: '#/components/schemas/RatedItem' }
 *         thighControl: { $ref: '#/components/schemas/RatedItem' }
 *         ballAbsorption: { $ref: '#/components/schemas/RatedItem' }
 *         technicalAssimilation: { $ref: '#/components/schemas/RatedItem' }
 *         concentration: { $ref: '#/components/schemas/RatedItem' }
 *         quickThinking: { $ref: '#/components/schemas/RatedItem' }
 *         technicalCoordination: { $ref: '#/components/schemas/RatedItem' }
 *         reactionSpeed: { $ref: '#/components/schemas/RatedItem' }
 *
 *     TacticalScores:
 *       type: object
 *       properties:
 *         attacking: { $ref: '#/components/schemas/RatedItem' }
 *         defending: { $ref: '#/components/schemas/RatedItem' }
 *         positioning: { $ref: '#/components/schemas/RatedItem' }
 *         movement: { $ref: '#/components/schemas/RatedItem' }
 *         tactics: { $ref: '#/components/schemas/RatedItem' }
 *         tacticalAssimilation: { $ref: '#/components/schemas/RatedItem' }
 *
 *     ContributionScores:
 *       type: object
 *       properties:
 *         offensivePerformance: { $ref: '#/components/schemas/RatedItem' }
 *         defensivePerformance: { $ref: '#/components/schemas/RatedItem' }
 *         crosses: { $ref: '#/components/schemas/RatedItem' }
 *         successfulDribbles: { $ref: '#/components/schemas/RatedItem' }
 *         keyPasses: { $ref: '#/components/schemas/RatedItem' }
 *         shots: { $ref: '#/components/schemas/RatedItem' }
 *         tackles: { $ref: '#/components/schemas/RatedItem' }
 *         ballRecovery: { $ref: '#/components/schemas/RatedItem' }
 *         ballLoss: { $ref: '#/components/schemas/RatedItem' }
 *         decisionMaking: { $ref: '#/components/schemas/RatedItem' }
 *         tacticalDiscipline: { $ref: '#/components/schemas/RatedItem' }
 *
 *     MatchEvaluation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         matchPlayerId:
 *           type: string
 *           format: uuid
 *         matchId:
 *           type: string
 *           format: uuid
 *         playerId:
 *           type: string
 *           format: uuid
 *         analystId:
 *           type: string
 *           format: uuid
 *         overallRating:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         fitnessScores:
 *           $ref: '#/components/schemas/FitnessScores'
 *         technicalScores:
 *           $ref: '#/components/schemas/TechnicalScores'
 *         tacticalScores:
 *           $ref: '#/components/schemas/TacticalScores'
 *         contributionScores:
 *           $ref: '#/components/schemas/ContributionScores'
 *         summary:
 *           type: string
 *         highlights:
 *           type: string
 *           nullable: true
 *         mistakes:
 *           type: string
 *           nullable: true
 *         strengths:
 *           type: string
 *           nullable: true
 *         weaknesses:
 *           type: string
 *           nullable: true
 *         recommendation:
 *           type: string
 *         needsReferral:
 *           type: boolean
 *         referralId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [Draft, PendingReview, Approved, NeedsRevision]
 *         approvalId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         approvedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         approvedBy:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         revisionComment:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     PlayerPerformanceSummary:
 *       type: object
 *       properties:
 *         playerId:
 *           type: string
 *           format: uuid
 *         totalEvaluations:
 *           type: integer
 *         avgOverallRating:
 *           type: number
 *           nullable: true
 *         avgFitnessScore:
 *           type: number
 *           nullable: true
 *         avgTechnicalScore:
 *           type: number
 *           nullable: true
 *         avgTacticalScore:
 *           type: number
 *           nullable: true
 *         avgOffensiveScore:
 *           type: number
 *           nullable: true
 *         avgDefensiveScore:
 *           type: number
 *           nullable: true
 *         last5AvgRating:
 *           type: number
 *           nullable: true
 *         performanceTrend:
 *           type: string
 *           enum: [improving, declining, stable]
 *           nullable: true
 *         declineAlert:
 *           type: boolean
 */

export {};
