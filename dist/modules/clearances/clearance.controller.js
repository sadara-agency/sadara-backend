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
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.complete = complete;
exports.remove = remove;
exports.getByContract = getByContract;
const clearanceService = __importStar(require("./clearance.service"));
const apiResponse_1 = require("../../shared/utils/apiResponse");
const errorHandler_1 = require("../../middleware/errorHandler");
// GET /api/v1/clearances
async function list(req, res) {
    const result = await clearanceService.listClearances(req.query);
    return (0, apiResponse_1.sendPaginated)(res, result.clearances, {
        page: result.page,
        limit: Number(req.query?.limit) || 20,
        total: result.total,
        totalPages: result.totalPages,
    });
}
// GET /api/v1/clearances/:id
async function getById(req, res) {
    const clearance = await clearanceService.getClearanceById(req.params.id);
    if (!clearance)
        throw new errorHandler_1.AppError('Clearance not found', 404);
    return (0, apiResponse_1.sendSuccess)(res, clearance);
}
// POST /api/v1/clearances
async function create(req, res) {
    const clearance = await clearanceService.createClearance(req.body, req.user.id);
    return (0, apiResponse_1.sendCreated)(res, clearance, 'Clearance created successfully');
}
// PUT /api/v1/clearances/:id
async function update(req, res) {
    const clearance = await clearanceService.updateClearance(req.params.id, req.body);
    return (0, apiResponse_1.sendSuccess)(res, clearance, 'Clearance updated successfully');
}
// POST /api/v1/clearances/:id/complete
async function complete(req, res) {
    const clearance = await clearanceService.completeClearance(req.params.id, req.body);
    return (0, apiResponse_1.sendSuccess)(res, clearance, 'Clearance completed successfully');
}
// DELETE /api/v1/clearances/:id
async function remove(req, res) {
    await clearanceService.deleteClearance(req.params.id);
    return (0, apiResponse_1.sendSuccess)(res, null, 'Clearance deleted successfully');
}
// GET /api/v1/contracts/:contractId/clearances
async function getByContract(req, res) {
    const clearances = await clearanceService.getClearancesByContract(req.params.contractId);
    return (0, apiResponse_1.sendSuccess)(res, clearances);
}
//# sourceMappingURL=clearance.controller.js.map