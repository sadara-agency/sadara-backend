import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
    createInvoiceSchema, updateInvoiceSchema, updateInvoiceStatusSchema, invoiceQuerySchema,
    createPaymentSchema, updatePaymentStatusSchema, paymentQuerySchema,
    createLedgerEntrySchema, ledgerQuerySchema,
    createValuationSchema, valuationQuerySchema,
} from './finance.schema';
import * as ctrl from './finance.controller';

const router = Router();
router.use(authenticate);

// ── Summary ──
router.get('/summary', asyncHandler(ctrl.summary));

// ── Invoices ──
router.get('/invoices', validate(invoiceQuerySchema, 'query'), asyncHandler(ctrl.listInvoices));
router.get('/invoices/:id', asyncHandler(ctrl.getInvoice));
router.post('/invoices', authorize('Admin', 'Manager'), validate(createInvoiceSchema), asyncHandler(ctrl.createInvoice));
router.patch('/invoices/:id', authorize('Admin', 'Manager'), validate(updateInvoiceSchema), asyncHandler(ctrl.updateInvoice));
router.patch('/invoices/:id/status', authorize('Admin', 'Manager'), validate(updateInvoiceStatusSchema), asyncHandler(ctrl.updateInvoiceStatus));
router.delete('/invoices/:id', authorize('Admin'), asyncHandler(ctrl.deleteInvoice));

// ── Payments ──
router.get('/payments', validate(paymentQuerySchema, 'query'), asyncHandler(ctrl.listPayments));
router.post('/payments', authorize('Admin', 'Manager'), validate(createPaymentSchema), asyncHandler(ctrl.createPayment));
router.patch('/payments/:id/status', authorize('Admin', 'Manager'), validate(updatePaymentStatusSchema), asyncHandler(ctrl.updatePaymentStatus));

// ── Ledger ──
router.get('/ledger', validate(ledgerQuerySchema, 'query'), asyncHandler(ctrl.listLedger));
router.post('/ledger', authorize('Admin'), validate(createLedgerEntrySchema), asyncHandler(ctrl.createLedgerEntry));

// ── Valuations ──
router.get('/valuations', validate(valuationQuerySchema, 'query'), asyncHandler(ctrl.listValuations));
router.post('/valuations', authorize('Admin', 'Manager', 'Analyst'), validate(createValuationSchema), asyncHandler(ctrl.createValuation));

export default router;