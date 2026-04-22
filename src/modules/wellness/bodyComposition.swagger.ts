/**
 * @swagger
 * tags:
 *   - name: BodyCompositions
 *     description: InBody scan recording — body composition, segmental analysis, metabolic fields, and optional PDF attachment
 *
 * components:
 *   schemas:
 *     BodyComposition:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         playerId:
 *           type: string
 *           format: uuid
 *         scanDate:
 *           type: string
 *           format: date
 *         scanDevice:
 *           type: string
 *           example: "InBody 570"
 *         weightKg:
 *           type: number
 *           example: 75.5
 *         bodyFatPct:
 *           type: number
 *           example: 12.3
 *         bodyFatMassKg:
 *           type: number
 *         leanBodyMassKg:
 *           type: number
 *         skeletalMuscleMassKg:
 *           type: number
 *         totalBodyWaterKg:
 *           type: number
 *         proteinKg:
 *           type: number
 *         mineralsKg:
 *           type: number
 *         segmentalLeanRightArm:
 *           type: number
 *         segmentalLeanLeftArm:
 *           type: number
 *         segmentalLeanTrunk:
 *           type: number
 *         segmentalLeanRightLeg:
 *           type: number
 *         segmentalLeanLeftLeg:
 *           type: number
 *         segmentalFatRightArm:
 *           type: number
 *         segmentalFatLeftArm:
 *           type: number
 *         segmentalFatTrunk:
 *           type: number
 *         segmentalFatRightLeg:
 *           type: number
 *         segmentalFatLeftLeg:
 *           type: number
 *         measuredBmr:
 *           type: integer
 *           description: Measured basal metabolic rate (kcal/day)
 *         visceralFatLevel:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *           description: InBody visceral fat level scale
 *         visceralFatAreaCm2:
 *           type: number
 *         waistHipRatio:
 *           type: number
 *         metabolicAge:
 *           type: integer
 *         pdfDocumentId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Optional linked InBody PDF from the documents module
 *         notes:
 *           type: string
 *           nullable: true
 *         recordedBy:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CreateScanDTO:
 *       type: object
 *       required:
 *         - playerId
 *         - scanDate
 *         - weightKg
 *       properties:
 *         playerId:
 *           type: string
 *           format: uuid
 *         scanDate:
 *           type: string
 *           format: date
 *         scanDevice:
 *           type: string
 *           maxLength: 50
 *         weightKg:
 *           type: number
 *           minimum: 0
 *         bodyFatPct:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         bodyFatMassKg:
 *           type: number
 *         leanBodyMassKg:
 *           type: number
 *         skeletalMuscleMassKg:
 *           type: number
 *         totalBodyWaterKg:
 *           type: number
 *         proteinKg:
 *           type: number
 *         mineralsKg:
 *           type: number
 *         segmentalLeanRightArm:
 *           type: number
 *         segmentalLeanLeftArm:
 *           type: number
 *         segmentalLeanTrunk:
 *           type: number
 *         segmentalLeanRightLeg:
 *           type: number
 *         segmentalLeanLeftLeg:
 *           type: number
 *         segmentalFatRightArm:
 *           type: number
 *         segmentalFatLeftArm:
 *           type: number
 *         segmentalFatTrunk:
 *           type: number
 *         segmentalFatRightLeg:
 *           type: number
 *         segmentalFatLeftLeg:
 *           type: number
 *         measuredBmr:
 *           type: integer
 *         visceralFatLevel:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *         visceralFatAreaCm2:
 *           type: number
 *         waistHipRatio:
 *           type: number
 *         metabolicAge:
 *           type: integer
 *         pdfDocumentId:
 *           type: string
 *           format: uuid
 *         notes:
 *           type: string
 *
 *     UpdateScanDTO:
 *       type: object
 *       description: All fields from CreateScanDTO (except playerId) are optional
 *       properties:
 *         scanDate:
 *           type: string
 *           format: date
 *         weightKg:
 *           type: number
 *         bodyFatPct:
 *           type: number
 *         notes:
 *           type: string
 */
