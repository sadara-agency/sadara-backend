import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as svc from './finance.service';

// ── Invoices ──
export async function listInvoices(req: AuthRequest, res: Response) { const r = await svc.listInvoices(req.query); sendPaginated(res, r.data, r.meta); }
export async function getInvoice(req: AuthRequest, res: Response) { sendSuccess(res, await svc.getInvoiceById(req.params.id)); }
export async function createInvoice(req: AuthRequest, res: Response) {
  const inv = await svc.createInvoice(req.body, req.user!.id);
  await logAudit('CREATE', 'invoices', inv.id, buildAuditContext(req.user!, req.ip), `Invoice created: ${inv.totalAmount}`);
  sendCreated(res, inv);
}
export async function updateInvoice(req: AuthRequest, res: Response) {
  const inv = await svc.updateInvoice(req.params.id, req.body);
  await logAudit('UPDATE', 'invoices', inv.id, buildAuditContext(req.user!, req.ip), 'Invoice updated');
  sendSuccess(res, inv, 'Invoice updated');
}
export async function updateInvoiceStatus(req: AuthRequest, res: Response) {
  const inv = await svc.updateInvoiceStatus(req.params.id, req.body);
  await logAudit('UPDATE', 'invoices', inv.id, buildAuditContext(req.user!, req.ip), `Invoice status → ${inv.status}`);
  sendSuccess(res, inv, `Status updated to ${inv.status}`);
}
export async function deleteInvoice(req: AuthRequest, res: Response) {
  const r = await svc.deleteInvoice(req.params.id);
  await logAudit('DELETE', 'invoices', r.id, buildAuditContext(req.user!, req.ip), 'Invoice deleted');
  sendSuccess(res, r, 'Invoice deleted');
}

// ── Payments ──
export async function listPayments(req: AuthRequest, res: Response) { const r = await svc.listPayments(req.query); sendPaginated(res, r.data, r.meta); }
export async function createPayment(req: AuthRequest, res: Response) {
  const p = await svc.createPayment(req.body);
  await logAudit('CREATE', 'payments', p.id, buildAuditContext(req.user!, req.ip), `Payment ${p.paymentType}: ${p.amount}`);
  sendCreated(res, p);
}
export async function updatePaymentStatus(req: AuthRequest, res: Response) {
  const p = await svc.updatePaymentStatus(req.params.id, req.body);
  await logAudit('UPDATE', 'payments', p.id, buildAuditContext(req.user!, req.ip), `Payment status → ${p.status}`);
  sendSuccess(res, p, `Payment ${p.status}`);
}

// ── Ledger ──
export async function listLedger(req: AuthRequest, res: Response) { const r = await svc.listLedger(req.query); sendPaginated(res, r.data, r.meta); }
export async function createLedgerEntry(req: AuthRequest, res: Response) {
  const le = await svc.createLedgerEntry(req.body, req.user!.id);
  await logAudit('CREATE', 'ledger_entries', le.id, buildAuditContext(req.user!, req.ip), `Ledger ${le.side}: ${le.account} ${le.amount}`);
  sendCreated(res, le);
}

// ── Valuations ──
export async function listValuations(req: AuthRequest, res: Response) { const r = await svc.listValuations(req.query); sendPaginated(res, r.data, r.meta); }
export async function createValuation(req: AuthRequest, res: Response) {
  const v = await svc.createValuation(req.body);
  await logAudit('CREATE', 'valuations', v.id, buildAuditContext(req.user!, req.ip), `Valuation: ${v.value} (${v.trend})`);
  sendCreated(res, v);
}

// ── Summary ──
export async function summary(req: AuthRequest, res: Response) { sendSuccess(res, await svc.getFinanceSummary()); }