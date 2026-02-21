"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gateQuerySchema = exports.toggleChecklistItemSchema = exports.createChecklistItemSchema = exports.advanceGateSchema = exports.updateGateSchema = exports.createGateSchema = void 0;
const zod_1 = require("zod");
// ── Create Gate ──
exports.createGateSchema = zod_1.z.object({
    playerId: zod_1.z.string().uuid('Invalid player ID'),
    gateNumber: zod_1.z.enum(['0', '1', '2', '3']),
    status: zod_1.z.enum(['Pending', 'InProgress', 'Completed']).default('Pending'),
    notes: zod_1.z.string().optional(),
});
// ── Update Gate ──
exports.updateGateSchema = zod_1.z.object({
    status: zod_1.z.enum(['Pending', 'InProgress', 'Completed']).optional(),
    notes: zod_1.z.string().optional(),
});
// ── Advance Gate (start / complete) ──
exports.advanceGateSchema = zod_1.z.object({
    action: zod_1.z.enum(['start', 'complete']),
    notes: zod_1.z.string().optional(),
});
// ── Checklist Item ──
exports.createChecklistItemSchema = zod_1.z.object({
    item: zod_1.z.string().min(1, 'Item text is required').max(500),
    isMandatory: zod_1.z.boolean().default(true),
    assignedTo: zod_1.z.string().uuid().optional(),
    sortOrder: zod_1.z.number().int().min(0).default(0),
    notes: zod_1.z.string().optional(),
});
exports.toggleChecklistItemSchema = zod_1.z.object({
    isCompleted: zod_1.z.boolean(),
    evidenceUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    notes: zod_1.z.string().optional(),
});
// ── Query Gates ──
exports.gateQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(200).default(20),
    sort: zod_1.z.string().default('gate_number'),
    order: zod_1.z.enum(['asc', 'desc']).default('asc'),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['Pending', 'InProgress', 'Completed']).optional(),
    gateNumber: zod_1.z.enum(['0', '1', '2', '3']).optional(),
    playerId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=gate.schema.js.map