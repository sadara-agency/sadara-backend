"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// ─────────────────────────────────────────────────────────────
// src/modules/tasks/task.routes.ts
// RESTful routes for Task CRUD.
//
// Replaces the old monolithic task.routes.ts that had
// schemas, raw SQL, and business logic all in one file.
//
// Same endpoints preserved for backward compatibility:
//   GET    /              → list (with filters)
//   GET    /:id           → get by ID
//   POST   /              → create
//   PATCH  /:id           → update task fields
//   PATCH  /:id/status    → update status only
//   DELETE /:id           → delete
// ─────────────────────────────────────────────────────────────
const express_1 = require("express");
const errorHandler_1 = require("../../middleware/errorHandler");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const task_schema_1 = require("./task.schema");
const taskController = __importStar(require("./task.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ── Read ──
router.get('/', (0, validate_1.validate)(task_schema_1.taskQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(taskController.list));
router.get('/:id', (0, errorHandler_1.asyncHandler)(taskController.getById));
// ── Write ──
router.post('/', (0, validate_1.validate)(task_schema_1.createTaskSchema), (0, errorHandler_1.asyncHandler)(taskController.create));
router.patch('/:id', (0, validate_1.validate)(task_schema_1.updateTaskSchema), (0, errorHandler_1.asyncHandler)(taskController.update));
router.patch('/:id/status', (0, validate_1.validate)(task_schema_1.updateStatusSchema), (0, errorHandler_1.asyncHandler)(taskController.updateStatus));
// ── Delete (Admin / Manager only) ──
router.delete('/:id', (0, auth_1.authorize)('Admin', 'Manager'), (0, errorHandler_1.asyncHandler)(taskController.remove));
exports.default = router;
//# sourceMappingURL=task.routes.js.map