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
const finance_schema_1 = require("./finance.schema");
const ctrl = __importStar(require("./finance.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ── Summary ──
router.get('/summary', (0, errorHandler_1.asyncHandler)(ctrl.summary));
// ── Invoices ──
router.get('/invoices', (0, validate_1.validate)(finance_schema_1.invoiceQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(ctrl.listInvoices));
router.get('/invoices/:id', (0, errorHandler_1.asyncHandler)(ctrl.getInvoice));
router.post('/invoices', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(finance_schema_1.createInvoiceSchema), (0, errorHandler_1.asyncHandler)(ctrl.createInvoice));
router.patch('/invoices/:id', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(finance_schema_1.updateInvoiceSchema), (0, errorHandler_1.asyncHandler)(ctrl.updateInvoice));
router.patch('/invoices/:id/status', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(finance_schema_1.updateInvoiceStatusSchema), (0, errorHandler_1.asyncHandler)(ctrl.updateInvoiceStatus));
router.delete('/invoices/:id', (0, auth_1.authorize)('Admin'), (0, errorHandler_1.asyncHandler)(ctrl.deleteInvoice));
// ── Payments ──
router.get('/payments', (0, validate_1.validate)(finance_schema_1.paymentQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(ctrl.listPayments));
router.post('/payments', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(finance_schema_1.createPaymentSchema), (0, errorHandler_1.asyncHandler)(ctrl.createPayment));
router.patch('/payments/:id/status', (0, auth_1.authorize)('Admin', 'Manager'), (0, validate_1.validate)(finance_schema_1.updatePaymentStatusSchema), (0, errorHandler_1.asyncHandler)(ctrl.updatePaymentStatus));
// ── Ledger ──
router.get('/ledger', (0, validate_1.validate)(finance_schema_1.ledgerQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(ctrl.listLedger));
router.post('/ledger', (0, auth_1.authorize)('Admin'), (0, validate_1.validate)(finance_schema_1.createLedgerEntrySchema), (0, errorHandler_1.asyncHandler)(ctrl.createLedgerEntry));
// ── Valuations ──
router.get('/valuations', (0, validate_1.validate)(finance_schema_1.valuationQuerySchema, 'query'), (0, errorHandler_1.asyncHandler)(ctrl.listValuations));
router.post('/valuations', (0, auth_1.authorize)('Admin', 'Manager', 'Analyst'), (0, validate_1.validate)(finance_schema_1.createValuationSchema), (0, errorHandler_1.asyncHandler)(ctrl.createValuation));
exports.default = router;
//# sourceMappingURL=finance.routes.js.map