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
exports.listInvoices = listInvoices;
exports.getInvoice = getInvoice;
exports.createInvoice = createInvoice;
exports.updateInvoice = updateInvoice;
exports.updateInvoiceStatus = updateInvoiceStatus;
exports.deleteInvoice = deleteInvoice;
exports.listPayments = listPayments;
exports.createPayment = createPayment;
exports.updatePaymentStatus = updatePaymentStatus;
exports.listLedger = listLedger;
exports.createLedgerEntry = createLedgerEntry;
exports.listValuations = listValuations;
exports.createValuation = createValuation;
exports.summary = summary;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const svc = __importStar(require("./finance.service"));
// ── Invoices ──
async function listInvoices(req, res) { const r = await svc.listInvoices(req.query); (0, apiResponse_1.sendPaginated)(res, r.data, r.meta); }
async function getInvoice(req, res) { (0, apiResponse_1.sendSuccess)(res, await svc.getInvoiceById(req.params.id)); }
async function createInvoice(req, res) {
    const inv = await svc.createInvoice(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'invoices', inv.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Invoice created: ${inv.totalAmount}`);
    (0, apiResponse_1.sendCreated)(res, inv);
}
async function updateInvoice(req, res) {
    const inv = await svc.updateInvoice(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'invoices', inv.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Invoice updated');
    (0, apiResponse_1.sendSuccess)(res, inv, 'Invoice updated');
}
async function updateInvoiceStatus(req, res) {
    const inv = await svc.updateInvoiceStatus(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'invoices', inv.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Invoice status → ${inv.status}`);
    (0, apiResponse_1.sendSuccess)(res, inv, `Status updated to ${inv.status}`);
}
async function deleteInvoice(req, res) {
    const r = await svc.deleteInvoice(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'invoices', r.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Invoice deleted');
    (0, apiResponse_1.sendSuccess)(res, r, 'Invoice deleted');
}
// ── Payments ──
async function listPayments(req, res) { const r = await svc.listPayments(req.query); (0, apiResponse_1.sendPaginated)(res, r.data, r.meta); }
async function createPayment(req, res) {
    const p = await svc.createPayment(req.body);
    await (0, audit_1.logAudit)('CREATE', 'payments', p.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Payment ${p.paymentType}: ${p.amount}`);
    (0, apiResponse_1.sendCreated)(res, p);
}
async function updatePaymentStatus(req, res) {
    const p = await svc.updatePaymentStatus(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'payments', p.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Payment status → ${p.status}`);
    (0, apiResponse_1.sendSuccess)(res, p, `Payment ${p.status}`);
}
// ── Ledger ──
async function listLedger(req, res) { const r = await svc.listLedger(req.query); (0, apiResponse_1.sendPaginated)(res, r.data, r.meta); }
async function createLedgerEntry(req, res) {
    const le = await svc.createLedgerEntry(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'ledger_entries', le.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Ledger ${le.side}: ${le.account} ${le.amount}`);
    (0, apiResponse_1.sendCreated)(res, le);
}
// ── Valuations ──
async function listValuations(req, res) { const r = await svc.listValuations(req.query); (0, apiResponse_1.sendPaginated)(res, r.data, r.meta); }
async function createValuation(req, res) {
    const v = await svc.createValuation(req.body);
    await (0, audit_1.logAudit)('CREATE', 'valuations', v.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Valuation: ${v.value} (${v.trend})`);
    (0, apiResponse_1.sendCreated)(res, v);
}
// ── Summary ──
async function summary(req, res) { (0, apiResponse_1.sendSuccess)(res, await svc.getFinanceSummary()); }
//# sourceMappingURL=finance.controller.js.map