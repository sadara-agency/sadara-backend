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
const express_1 = require("express");
const errorHandler_1 = require("../../middleware/errorHandler");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const gate_schema_1 = require("./gate.schema");
const gateController = __importStar(require("./gate.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ── Gates CRUD ──
router.get('/', (0, validate_1.validate)(gate_schema_1.gateQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(gateController.list));
router.get('/:id', (0, errorHandler_1.asyncHandler)(gateController.getById));
router.get('/player/:playerId', (0, errorHandler_1.asyncHandler)(gateController.getPlayerGates));
router.post('/', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(gate_schema_1.createGateSchema), (0, errorHandler_1.asyncHandler)(gateController.create));
router.patch('/:id', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(gate_schema_1.updateGateSchema), (0, errorHandler_1.asyncHandler)(gateController.update));
router.patch('/:id/advance', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(gate_schema_1.advanceGateSchema), (0, errorHandler_1.asyncHandler)(gateController.advance));
router.delete('/:id', (0, auth_1.authorize)('Admin'), (0, errorHandler_1.asyncHandler)(gateController.remove));
// ── Checklist Items ──
router.post('/:gateId/checklist', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(gate_schema_1.createChecklistItemSchema), (0, errorHandler_1.asyncHandler)(gateController.addChecklistItem));
router.patch('/checklist/:itemId', (0, auth_1.authorize)('Admin', 'Manager', 'Analyst'), (0, validate_1.validate)(gate_schema_1.toggleChecklistItemSchema), (0, errorHandler_1.asyncHandler)(gateController.toggleChecklistItem));
router.delete('/checklist/:itemId', (0, auth_1.authorize)('Admin', 'Manager'), (0, errorHandler_1.asyncHandler)(gateController.deleteChecklistItem));
exports.default = router;
//# sourceMappingURL=gate.routes.js.map