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
const club_schema_1 = require("./club.schema");
const clubController = __importStar(require("./club.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, validate_1.validate)(club_schema_1.clubQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(clubController.list));
router.get('/:id', (0, errorHandler_1.asyncHandler)(clubController.getById));
router.post('/', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(club_schema_1.createClubSchema), (0, errorHandler_1.asyncHandler)(clubController.create));
router.patch('/:id', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(club_schema_1.updateClubSchema), (0, errorHandler_1.asyncHandler)(clubController.update));
router.delete('/:id', (0, auth_1.authorize)('Admin'), (0, errorHandler_1.asyncHandler)(clubController.remove));
exports.default = router;
//# sourceMappingURL=club.routes.js.map