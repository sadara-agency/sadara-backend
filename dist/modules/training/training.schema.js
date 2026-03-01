"use strict";
// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.schema.ts
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEnrollmentSchema = exports.enrollPlayersSchema = exports.updateCourseSchema = exports.createCourseSchema = void 0;
const zod_1 = require("zod");
exports.createCourseSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    titleAr: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    descriptionAr: zod_1.z.string().optional(),
    contentType: zod_1.z.enum(['Video', 'PDF', 'Link', 'Exercise', 'Mixed']).default('Mixed'),
    contentUrl: zod_1.z.string().url().optional(),
    category: zod_1.z.string().optional(),
    difficulty: zod_1.z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
    durationHours: zod_1.z.number().positive().optional(),
});
exports.updateCourseSchema = exports.createCourseSchema.partial().extend({
    isActive: zod_1.z.boolean().optional(),
});
exports.enrollPlayersSchema = zod_1.z.object({
    playerIds: zod_1.z.array(zod_1.z.string().uuid()).min(1, 'Select at least one player'),
});
exports.updateEnrollmentSchema = zod_1.z.object({
    status: zod_1.z.enum(['NotStarted', 'InProgress', 'Completed', 'Dropped']).optional(),
    progressPct: zod_1.z.number().int().min(0).max(100).optional(),
    notes: zod_1.z.string().optional(),
});
//# sourceMappingURL=training.schema.js.map