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
const offer_schema_1 = require("./offer.schema");
const offerController = __importStar(require("./offer.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ── List & Read ──
router.get('/', (0, validate_1.validate)(offer_schema_1.offerQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(offerController.list));
router.get('/:id', (0, errorHandler_1.asyncHandler)(offerController.getById));
router.get('/player/:playerId', (0, errorHandler_1.asyncHandler)(offerController.getByPlayer));
// ── Create ──
router.post('/', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(offer_schema_1.createOfferSchema), (0, errorHandler_1.asyncHandler)(offerController.create));
// ── Update ──
router.patch('/:id', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(offer_schema_1.updateOfferSchema), (0, errorHandler_1.asyncHandler)(offerController.update));
router.patch('/:id/status', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(offer_schema_1.updateOfferStatusSchema), (0, errorHandler_1.asyncHandler)(offerController.updateStatus));
// ── Delete ──
router.delete('/:id', (0, auth_1.authorize)('Admin'), (0, errorHandler_1.asyncHandler)(offerController.remove));
exports.default = router;
//# sourceMappingURL=offer.routes.js.map