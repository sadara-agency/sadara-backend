"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentQuerySchema = exports.updateDocumentSchema = exports.createDocumentSchema = void 0;
const zod_1 = require("zod");
const docTypes = ['Contract', 'Passport', 'Medical', 'ID', 'Agreement', 'Other'];
const docStatuses = ['Active', 'Valid', 'Pending', 'Expired'];
exports.createDocumentSchema = zod_1.z.object({
    playerId: zod_1.z.string().uuid().optional(),
    contractId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1).max(500),
    type: zod_1.z.enum(docTypes).default('Other'),
    status: zod_1.z.enum(docStatuses).default('Active'),
    fileUrl: zod_1.z.string().min(1),
    fileSize: zod_1.z.number().int().min(0).optional(),
    mimeType: zod_1.z.string().max(100).optional(),
    issueDate: zod_1.z.string().optional(),
    expiryDate: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    notes: zod_1.z.string().optional(),
});
exports.updateDocumentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(500).optional(),
    type: zod_1.z.enum(docTypes).optional(),
    status: zod_1.z.enum(docStatuses).optional(),
    fileUrl: zod_1.z.string().min(1).optional(),
    fileSize: zod_1.z.number().int().min(0).optional(),
    mimeType: zod_1.z.string().max(100).optional(),
    issueDate: zod_1.z.string().nullable().optional(),
    expiryDate: zod_1.z.string().nullable().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    notes: zod_1.z.string().optional(),
});
exports.documentQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('created_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    type: zod_1.z.enum(docTypes).optional(),
    status: zod_1.z.enum(docStatuses).optional(),
    playerId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=document.schema.js.map