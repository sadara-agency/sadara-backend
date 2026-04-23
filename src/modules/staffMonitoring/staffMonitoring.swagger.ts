/**
 * @swagger
 * components:
 *   schemas:
 *     StaffEngagementRow:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *         fullName:
 *           type: string
 *         fullNameAr:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *         loginCount:
 *           type: integer
 *         activeDays:
 *           type: integer
 *         totalHours:
 *           type: number
 *         avgSessionMinutes:
 *           type: number
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         onlineStatus:
 *           type: string
 *           enum: [online, idle, offline]
 *
 *     SessionRow:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         startedAt:
 *           type: string
 *           format: date-time
 *         endedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         durationSeconds:
 *           type: integer
 *           nullable: true
 *         ipAddress:
 *           type: string
 *           nullable: true
 *         endReason:
 *           type: string
 *           nullable: true
 *
 *     StaffEngagementDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/StaffEngagementRow'
 *         - type: object
 *           properties:
 *             dailyHours:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   hours:
 *                     type: number
 *             recentSessions:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SessionRow'
 *
 *     StaffTaskPerformanceRow:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *         fullName:
 *           type: string
 *         fullNameAr:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *         totalAssigned:
 *           type: integer
 *         completed:
 *           type: integer
 *         overdue:
 *           type: integer
 *         completionRate:
 *           type: number
 *           description: Percentage 0–100
 *         onTimeRate:
 *           type: number
 *           description: Fraction 0–1
 *         avgCompletionHours:
 *           type: number
 *         priorityWeightedCompleted:
 *           type: number
 *
 *     StaffRankingRow:
 *       allOf:
 *         - $ref: '#/components/schemas/StaffTaskPerformanceRow'
 *         - type: object
 *           properties:
 *             activeDays:
 *               type: integer
 *             totalHours:
 *               type: number
 *             productivityScore:
 *               type: integer
 *               description: 0–100
 *             qualityScore:
 *               type: integer
 *               description: 0–100
 *             engagementScore:
 *               type: integer
 *               description: 0–100
 *             kpiScore:
 *               type: integer
 *               description: 0–100 composite score
 *             rank:
 *               type: integer
 *             isTopPerformer:
 *               type: boolean
 *             isUnderperformer:
 *               type: boolean
 *
 *     HeatmapCell:
 *       type: object
 *       properties:
 *         dayOfWeek:
 *           type: integer
 *           description: 0 = Sunday, 6 = Saturday (PostgreSQL DOW)
 *         hour:
 *           type: integer
 *           description: 0–23
 *         count:
 *           type: integer
 */

export {};
