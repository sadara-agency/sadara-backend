import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { logger } from "@config/logger";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import * as svc from "@modules/finance/finance.service";
import { createApprovalRequest } from "@modules/approvals/approval.service";

// Approval thresholds for high-value invoices
const APPROVAL_THRESHOLD_HIGH = 50_000;
const APPROVAL_THRESHOLD_CRITICAL = 100_000;

// Fire-and-forget cache invalidation helper
function bustFinanceCache(extra: string[] = []) {
  invalidateMultiple([
    CachePrefix.FINANCE,
    CachePrefix.DASHBOARD,
    ...extra,
  ]).catch((err) =>
    logger.warn("Finance cache invalidation failed", {
      error: (err as Error).message,
    }),
  );
}

// ── Invoices ──
export async function listInvoices(req: AuthRequest, res: Response) {
  const r = await svc.listInvoices(req.query, req.user);
  sendPaginated(res, r.data, r.meta);
}
export async function getInvoice(req: AuthRequest, res: Response) {
  sendSuccess(res, await svc.getInvoiceById(req.params.id, req.user));
}
export async function createInvoice(req: AuthRequest, res: Response) {
  const inv = await svc.createInvoice(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "invoices",
    inv.id,
    buildAuditContext(req.user!, req.ip),
    `Invoice created: ${inv.totalAmount}`,
  );
  // High-value invoice → approval required
  const amount = Number(inv.totalAmount) || 0;
  if (amount >= APPROVAL_THRESHOLD_HIGH) {
    createApprovalRequest({
      entityType: "payment",
      entityId: inv.id,
      entityTitle: `Invoice: ${inv.invoiceNumber || `#${inv.id.slice(0, 8)}`} (${amount.toLocaleString()})`,
      action: "approve_payment",
      requestedBy: req.user!.id,
      assignedRole: "Admin",
      priority: amount >= APPROVAL_THRESHOLD_CRITICAL ? "critical" : "high",
    }).catch((err) =>
      logger.warn("Finance approval request failed", {
        error: (err as Error).message,
      }),
    );
  }

  bustFinanceCache();
  sendCreated(res, inv);
}
export async function updateInvoice(req: AuthRequest, res: Response) {
  const inv = await svc.updateInvoice(req.params.id, req.body);
  await logAudit(
    "UPDATE",
    "invoices",
    inv.id,
    buildAuditContext(req.user!, req.ip),
    "Invoice updated",
  );
  bustFinanceCache();
  sendSuccess(res, inv, "Invoice updated");
}
export async function updateInvoiceStatus(req: AuthRequest, res: Response) {
  const inv = await svc.updateInvoiceStatus(req.params.id, req.body);
  await logAudit(
    "UPDATE",
    "invoices",
    inv.id,
    buildAuditContext(req.user!, req.ip),
    `Invoice status → ${inv.status}`,
  );
  bustFinanceCache();
  sendSuccess(res, inv, `Status updated to ${inv.status}`);
}
export async function deleteInvoice(req: AuthRequest, res: Response) {
  const r = await svc.deleteInvoice(req.params.id);
  await logAudit(
    "DELETE",
    "invoices",
    r.id,
    buildAuditContext(req.user!, req.ip),
    "Invoice deleted",
  );
  bustFinanceCache();
  sendSuccess(res, r, "Invoice deleted");
}

// ── Payments ──
export async function listPayments(req: AuthRequest, res: Response) {
  const r = await svc.listPayments(req.query, req.user);
  sendPaginated(res, r.data, r.meta);
}
export async function createPayment(req: AuthRequest, res: Response) {
  const p = await svc.createPayment(req.body);
  await logAudit(
    "CREATE",
    "payments",
    p.id,
    buildAuditContext(req.user!, req.ip),
    `Payment ${p.paymentType}: ${p.amount}`,
  );
  bustFinanceCache([CachePrefix.CONTRACTS]);
  sendCreated(res, p);
}
export async function updatePaymentStatus(req: AuthRequest, res: Response) {
  const p = await svc.updatePaymentStatus(req.params.id, req.body);
  await logAudit(
    "UPDATE",
    "payments",
    p.id,
    buildAuditContext(req.user!, req.ip),
    `Payment status → ${p.status}`,
  );
  bustFinanceCache([CachePrefix.CONTRACTS]);
  sendSuccess(res, p, `Payment ${p.status}`);
}

// ── Ledger ──
export async function listLedger(req: AuthRequest, res: Response) {
  const r = await svc.listLedger(req.query, req.user);
  sendPaginated(res, r.data, r.meta);
}
export async function createLedgerEntry(req: AuthRequest, res: Response) {
  const le = await svc.createLedgerEntry(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "ledger_entries",
    le.id,
    buildAuditContext(req.user!, req.ip),
    `Ledger ${le.side}: ${le.account} ${le.amount}`,
  );
  bustFinanceCache();
  sendCreated(res, le);
}

// ── Valuations ──
export async function listValuations(req: AuthRequest, res: Response) {
  const r = await svc.listValuations(req.query, req.user);
  sendPaginated(res, r.data, r.meta);
}
export async function createValuation(req: AuthRequest, res: Response) {
  const v = await svc.createValuation(req.body);
  await logAudit(
    "CREATE",
    "valuations",
    v.id,
    buildAuditContext(req.user!, req.ip),
    `Valuation: ${v.value} (${v.trend})`,
  );
  bustFinanceCache([CachePrefix.PLAYERS]);
  sendCreated(res, v);
}

// ── Summary ──
export async function summary(req: AuthRequest, res: Response) {
  sendSuccess(res, await svc.getFinanceSummary(12, req.user));
}

// ── Financial Dashboard (PRD enhanced) ──
export async function dashboard(req: AuthRequest, res: Response) {
  sendSuccess(
    res,
    await svc.getFinancialDashboard(
      req.query.playerContractType as string | undefined,
      (req.query.comparisonPeriod as "MoM" | "QoQ" | "YoY") || "MoM",
      req.user,
    ),
  );
}

// ── Expenses ──
export async function listExpenses(req: AuthRequest, res: Response) {
  const r = await svc.listExpenses(req.query, req.user);
  sendPaginated(res, r.data, r.meta);
}
export async function createExpense(req: AuthRequest, res: Response) {
  const exp = await svc.createExpense(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "expenses",
    exp.id,
    buildAuditContext(req.user!, req.ip),
    `Expense: ${exp.category} ${exp.amount}`,
  );
  bustFinanceCache();
  sendCreated(res, exp);
}
export async function updateExpense(req: AuthRequest, res: Response) {
  const exp = await svc.updateExpense(req.params.id, req.body);
  await logAudit(
    "UPDATE",
    "expenses",
    exp.id,
    buildAuditContext(req.user!, req.ip),
    "Expense updated",
  );
  bustFinanceCache();
  sendSuccess(res, exp, "Expense updated");
}
export async function deleteExpense(req: AuthRequest, res: Response) {
  const r = await svc.deleteExpense(req.params.id);
  await logAudit(
    "DELETE",
    "expenses",
    r.id,
    buildAuditContext(req.user!, req.ip),
    "Expense deleted",
  );
  bustFinanceCache();
  sendSuccess(res, r, "Expense deleted");
}
