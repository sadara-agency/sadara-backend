import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
  invoiceQuerySchema,
  createPaymentSchema,
  updatePaymentStatusSchema,
  paymentQuerySchema,
  createLedgerEntrySchema,
  ledgerQuerySchema,
  createValuationSchema,
  valuationQuerySchema,
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
  dashboardQuerySchema,
} from "@modules/finance/finance.schema";
import * as ctrl from "@modules/finance/finance.controller";
import { dynamicFieldAccess } from "@middleware/fieldAccess";

const router = Router();
router.use(authenticate);

// ── Summary & Dashboard ──
router.get(
  "/summary",
  authorizeModule("finance", "read"),
  dynamicFieldAccess("finance"),
  asyncHandler(ctrl.summary),
);
router.get(
  "/dashboard",
  authorizeModule("finance", "read"),
  dynamicFieldAccess("finance"),
  validate(dashboardQuerySchema, "query"),
  asyncHandler(ctrl.dashboard),
);

// ── Invoices ──
router.get(
  "/invoices",
  authorizeModule("finance", "read"),
  validate(invoiceQuerySchema, "query"),
  dynamicFieldAccess("finance"),
  asyncHandler(ctrl.listInvoices),
);
router.get(
  "/invoices/:id",
  authorizeModule("finance", "read"),
  dynamicFieldAccess("finance"),
  asyncHandler(ctrl.getInvoice),
);
router.post(
  "/invoices",
  authorizeModule("finance", "create"),
  validate(createInvoiceSchema),
  asyncHandler(ctrl.createInvoice),
);
router.patch(
  "/invoices/:id",
  authorizeModule("finance", "update"),
  validate(updateInvoiceSchema),
  asyncHandler(ctrl.updateInvoice),
);
router.patch(
  "/invoices/:id/status",
  authorizeModule("finance", "update"),
  validate(updateInvoiceStatusSchema),
  asyncHandler(ctrl.updateInvoiceStatus),
);
router.delete(
  "/invoices/:id",
  authorizeModule("finance", "delete"),
  asyncHandler(ctrl.deleteInvoice),
);

// ── Payments ──
router.get(
  "/payments",
  authorizeModule("finance", "read"),
  validate(paymentQuerySchema, "query"),
  dynamicFieldAccess("finance"),
  asyncHandler(ctrl.listPayments),
);
router.post(
  "/payments",
  authorizeModule("finance", "create"),
  validate(createPaymentSchema),
  asyncHandler(ctrl.createPayment),
);
router.patch(
  "/payments/:id/status",
  authorizeModule("finance", "update"),
  validate(updatePaymentStatusSchema),
  asyncHandler(ctrl.updatePaymentStatus),
);

// ── Ledger ──
router.get(
  "/ledger",
  authorizeModule("finance", "read"),
  validate(ledgerQuerySchema, "query"),
  dynamicFieldAccess("finance"),
  asyncHandler(ctrl.listLedger),
);
router.post(
  "/ledger",
  authorizeModule("finance", "create"),
  validate(createLedgerEntrySchema),
  asyncHandler(ctrl.createLedgerEntry),
);

// ── Valuations ──
router.get(
  "/valuations",
  authorizeModule("finance", "read"),
  dynamicFieldAccess("finance"),
  validate(valuationQuerySchema, "query"),
  asyncHandler(ctrl.listValuations),
);
router.post(
  "/valuations",
  authorizeModule("finance", "create"),
  validate(createValuationSchema),
  asyncHandler(ctrl.createValuation),
);

// ── Expenses ──
router.get(
  "/expenses",
  authorizeModule("finance", "read"),
  dynamicFieldAccess("finance"),
  validate(expenseQuerySchema, "query"),
  asyncHandler(ctrl.listExpenses),
);
router.post(
  "/expenses",
  authorizeModule("finance", "create"),
  validate(createExpenseSchema),
  asyncHandler(ctrl.createExpense),
);
router.patch(
  "/expenses/:id",
  authorizeModule("finance", "update"),
  validate(updateExpenseSchema),
  asyncHandler(ctrl.updateExpense),
);
router.delete(
  "/expenses/:id",
  authorizeModule("finance", "delete"),
  asyncHandler(ctrl.deleteExpense),
);

export default router;
