/**
 * @swagger
 * components:
 *   schemas:
 *     NutritionPrescription:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         playerId:
 *           type: string
 *           format: uuid
 *         versionNumber:
 *           type: integer
 *           minimum: 1
 *         issuedAt:
 *           type: string
 *           format: date-time
 *         issuedBy:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         triggeringReason:
 *           type: string
 *           enum: [manual, scan, injury, block_change]
 *         triggeringScanId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         trainingBlockId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         supersededAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         supersededBy:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         targetCalories:
 *           type: integer
 *           nullable: true
 *         targetProteinG:
 *           type: number
 *           nullable: true
 *         targetCarbsG:
 *           type: number
 *           nullable: true
 *         targetFatG:
 *           type: number
 *           nullable: true
 *         hydrationTargetMl:
 *           type: integer
 *           nullable: true
 *         preTrainingGuidance:
 *           type: string
 *           nullable: true
 *         postTrainingGuidance:
 *           type: string
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     IssuePrescriptionDTO:
 *       type: object
 *       required:
 *         - playerId
 *       properties:
 *         playerId:
 *           type: string
 *           format: uuid
 *         trainingBlockId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         targetCalories:
 *           type: integer
 *           minimum: 1
 *         targetProteinG:
 *           type: number
 *           minimum: 0
 *         targetCarbsG:
 *           type: number
 *           minimum: 0
 *         targetFatG:
 *           type: number
 *           minimum: 0
 *         hydrationTargetMl:
 *           type: integer
 *           minimum: 1
 *         preTrainingGuidance:
 *           type: string
 *           maxLength: 2000
 *         postTrainingGuidance:
 *           type: string
 *           maxLength: 2000
 *         notes:
 *           type: string
 *           maxLength: 1000
 *
 *     ReissuePrescriptionDTO:
 *       type: object
 *       properties:
 *         triggeringReason:
 *           type: string
 *           enum: [manual, scan, injury, block_change]
 *           default: manual
 *         triggeringScanId:
 *           type: string
 *           format: uuid
 *           nullable: true
 */
