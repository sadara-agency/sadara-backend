"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injuryQuerySchema = exports.addInjuryUpdateSchema = exports.updateInjurySchema = exports.createInjurySchema = exports.INJURY_CAUSES = exports.INJURY_SEVERITIES = exports.INJURY_STATUSES = void 0;
const zod_1 = require("zod");
exports.INJURY_STATUSES = ['UnderTreatment', 'Recovered', 'Relapsed', 'Chronic'];
exports.INJURY_SEVERITIES = ['Minor', 'Moderate', 'Severe', 'Critical'];
exports.INJURY_CAUSES = ['Training', 'Match', 'NonFootball', 'Unknown'];
exports.createInjurySchema = zod_1.z.object({
    playerId: zod_1.z.string().uuid(),
    matchId: zod_1.z.string().uuid().optional(),
    injuryType: zod_1.z.string().min(1, 'Injury type is required'),
    injuryTypeAr: zod_1.z.string().optional(),
    bodyPart: zod_1.z.string().min(1, 'Body part is required'),
    bodyPartAr: zod_1.z.string().optional(),
    severity: zod_1.z.enum(exports.INJURY_SEVERITIES).default('Moderate'),
    cause: zod_1.z.enum(exports.INJURY_CAUSES).default('Unknown'),
    injuryDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    expectedReturnDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    diagnosis: zod_1.z.string().optional(),
    diagnosisAr: zod_1.z.string().optional(),
    treatmentPlan: zod_1.z.string().optional(),
    treatmentPlanAr: zod_1.z.string().optional(),
    medicalProvider: zod_1.z.string().optional(),
    surgeonName: zod_1.z.string().optional(),
    estimatedDaysOut: zod_1.z.number().int().min(0).optional(),
    isSurgeryRequired: zod_1.z.boolean().default(false),
    surgeryDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: zod_1.z.string().optional(),
});
exports.updateInjurySchema = zod_1.z.object({
    injuryType: zod_1.z.string().min(1).optional(),
    injuryTypeAr: zod_1.z.string().optional(),
    bodyPart: zod_1.z.string().min(1).optional(),
    bodyPartAr: zod_1.z.string().optional(),
    severity: zod_1.z.enum(exports.INJURY_SEVERITIES).optional(),
    cause: zod_1.z.enum(exports.INJURY_CAUSES).optional(),
    status: zod_1.z.enum(exports.INJURY_STATUSES).optional(),
    expectedReturnDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    actualReturnDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    diagnosis: zod_1.z.string().optional(),
    diagnosisAr: zod_1.z.string().optional(),
    treatmentPlan: zod_1.z.string().optional(),
    treatmentPlanAr: zod_1.z.string().optional(),
    medicalProvider: zod_1.z.string().optional(),
    surgeonName: zod_1.z.string().optional(),
    estimatedDaysOut: zod_1.z.number().int().min(0).nullable().optional(),
    actualDaysOut: zod_1.z.number().int().min(0).nullable().optional(),
    isSurgeryRequired: zod_1.z.boolean().optional(),
    surgeryDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    notes: zod_1.z.string().optional(),
});
exports.addInjuryUpdateSchema = zod_1.z.object({
    status: zod_1.z.enum(exports.INJURY_STATUSES).optional(),
    notes: zod_1.z.string().min(1, 'Notes required'),
    notesAr: zod_1.z.string().optional(),
});
exports.injuryQuerySchema = zod_1.z.object({
    playerId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(exports.INJURY_STATUSES).optional(),
    severity: zod_1.z.enum(exports.INJURY_SEVERITIES).optional(),
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
    page: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional(),
    sort: zod_1.z.string().optional(),
    order: zod_1.z.enum(['ASC', 'DESC', 'asc', 'desc']).optional(),
    search: zod_1.z.string().optional(),
});
//# sourceMappingURL=injury.schema.js.map