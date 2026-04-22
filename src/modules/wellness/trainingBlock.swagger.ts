/**
 * @swagger
 * components:
 *   schemas:
 *     TrainingBlock:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         playerId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [active, paused, closed]
 *         goal:
 *           type: string
 *           enum: [bulk, cut, maintenance, recomp, rehab]
 *         durationWeeks:
 *           type: integer
 *           minimum: 1
 *           maximum: 16
 *         startedAt:
 *           type: string
 *           format: date
 *         plannedEndAt:
 *           type: string
 *           format: date
 *         closedAt:
 *           type: string
 *           format: date
 *           nullable: true
 *         pausedAt:
 *           type: string
 *           format: date
 *           nullable: true
 *         startScanId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         endScanId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         targetOutcomes:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         notes:
 *           type: string
 *           nullable: true
 *         closedBy:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         createdBy:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     OpenBlockDTO:
 *       type: object
 *       required:
 *         - playerId
 *         - goal
 *         - durationWeeks
 *       properties:
 *         playerId:
 *           type: string
 *           format: uuid
 *         goal:
 *           type: string
 *           enum: [bulk, cut, maintenance, recomp, rehab]
 *         durationWeeks:
 *           type: integer
 *           minimum: 1
 *           maximum: 16
 *         startedAt:
 *           type: string
 *           format: date
 *           description: Defaults to today if omitted
 *         startScanId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         targetOutcomes:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         notes:
 *           type: string
 *           nullable: true
 *
 *     UpdateBlockDTO:
 *       type: object
 *       properties:
 *         goal:
 *           type: string
 *           enum: [bulk, cut, maintenance, recomp, rehab]
 *         durationWeeks:
 *           type: integer
 *           minimum: 1
 *           maximum: 16
 *         startedAt:
 *           type: string
 *           format: date
 *         startScanId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         targetOutcomes:
 *           type: object
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *
 *     CloseBlockDTO:
 *       type: object
 *       properties:
 *         endScanId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         closedAt:
 *           type: string
 *           format: date
 *           description: Defaults to today if omitted
 *         notes:
 *           type: string
 *           nullable: true
 */
