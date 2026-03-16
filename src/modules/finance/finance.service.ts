import { Op, QueryTypes } from "sequelize";
import { randomUUID } from "crypto";
import { sequelize } from "@config/database";
import {
  Invoice,
  Payment,
  LedgerEntry,
  Valuation,
  Expense,
  type PaymentStatus,
  type PaymentType,
  type ExpenseCategory,
  type ValuationTrend,
} from "@modules/finance/finance.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow, destroyById } from "@shared/utils/serviceHelpers";
import { PaginationQuery } from "@shared/types";
import {
  cacheOrFetch,
  buildCacheKey,
  CacheTTL,
  CachePrefix,
} from "@shared/utils/cache";

// ── Query parameter interfaces ──

interface InvoiceQueryParams extends PaginationQuery {
  status?: PaymentStatus;
  playerId?: string;
  clubId?: string;
}

interface PaymentQueryParams extends PaginationQuery {
  status?: PaymentStatus;
  paymentType?: PaymentType;
  playerId?: string;
}

interface LedgerQueryParams extends PaginationQuery {
  side?: "Debit" | "Credit";
  account?: string;
  playerId?: string;
}

interface ValuationQueryParams extends PaginationQuery {
  playerId?: string;
}

interface ExpenseQueryParams extends PaginationQuery {
  category?: ExpenseCategory;
  playerId?: string;
}

// ── Input interfaces ──

interface CreateInvoiceInput {
  contractId?: string;
  playerId?: string;
  clubId?: string;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  description?: string;
  lineItems?: object;
}

interface UpdateInvoiceInput {
  amount?: number;
  taxAmount?: number;
  totalAmount?: number;
  dueDate?: string;
  description?: string;
  lineItems?: object;
}

interface UpdateStatusInput {
  status: PaymentStatus;
  paidDate?: string;
  reference?: string;
}

interface CreatePaymentInput {
  invoiceId?: string;
  milestoneId?: string;
  playerId?: string;
  amount: number;
  currency?: string;
  paymentType: PaymentType;
  dueDate: string;
  reference?: string;
  payer?: string;
  notes?: string;
}

interface CreateLedgerInput {
  side: "Debit" | "Credit";
  account: string;
  amount: number;
  currency?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  playerId?: string;
}

interface CreateValuationInput {
  playerId: string;
  value: number;
  currency?: string;
  source?: string;
  trend?: ValuationTrend;
  changePct?: number | string;
  valuedAt: string;
  notes?: string;
}

interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  date: string;
  description?: string;
  playerId?: string;
}

// ── Raw query result interfaces ──

interface MarketValueRow {
  total_market_value: string;
  total_players: number;
}

interface DistributionRow {
  contract_type: string;
  count: number;
}

interface CommissionsRow {
  expected_commissions: string;
  collected_commissions: string;
  outstanding_commissions: string;
}

interface TopPlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  market_value: string;
  market_value_currency: string;
  position: string;
  photo_url: string | null;
  club_name: string | null;
  club_name_ar: string | null;
}

interface MarketValueTrendRow {
  month: string;
  total_value: string;
  players_valued: number;
}

interface RevenueByClubRow {
  club_id: string;
  club_name: string;
  club_name_ar: string | null;
  logo_url: string | null;
  total_revenue: string;
  invoice_count: number;
}

interface PlayerRevenueRow {
  id: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  photo_url: string | null;
  club_name: string | null;
  club_name_ar: string | null;
  commissions: string;
  sponsorship: string;
  bonus: string;
  total_revenue: string;
}

interface CashFlowRow {
  month: string;
  expected: string;
  received: string;
}

interface RevenueRow {
  total_revenue: string;
}

interface ExpenseTotalRow {
  total_expenses: string;
}

interface InvoiceStatsRow {
  total_paid: string;
  total_pending: string;
  total_overdue: string;
  overdue_count: number;
  total_invoices: number;
}

interface RevenueByMonthRow {
  month: string;
  paid: string;
}

interface RevenueByTypeRow {
  payment_type: string;
  total: string;
}

interface PeriodComparisonRow {
  current_revenue: string;
  previous_revenue: string;
  current_commissions: string;
  previous_commissions: string;
  current_count: number;
  previous_count: number;
}

interface ContractExpiryRow {
  id: string;
  end_date: string;
  status: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  club_name: string | null;
  club_name_ar: string | null;
}

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "photoUrl",
] as const;
const CLUB_ATTRS = ["id", "name", "nameAr", "logoUrl"] as const;

// ══════════════════════════════════════════
// INVOICES
// ══════════════════════════════════════════

export async function listInvoices(queryParams: InvoiceQueryParams) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );

  const where: Record<string | symbol, any> = {};
  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.clubId) where.clubId = queryParams.clubId;
  if (search) {
    where[Op.or] = [
      { invoiceNumber: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { "$player.first_name$": { [Op.iLike]: `%${search}%` } },
      { "$player.last_name$": { [Op.iLike]: `%${search}%` } },
      { "$club.name$": { [Op.iLike]: `%${search}%` } },
    ];
  }
  const { count, rows } = await Invoice.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    subQuery: false,
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      { model: Club, as: "club", attributes: [...CLUB_ATTRS] },
    ],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getInvoiceById(id: string) {
  const inv = await Invoice.findByPk(id, {
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      { model: Club, as: "club", attributes: [...CLUB_ATTRS] },
      { model: User, as: "creator", attributes: ["id", "fullName"] },
    ],
  });
  if (!inv) throw new AppError("Invoice not found", 404);
  return inv;
}

export async function createInvoice(input: CreateInvoiceInput, userId: string) {
  // invoice_number auto-generated by DB trigger
  return await Invoice.create({
    ...input,
    invoiceNumber: "",
    createdBy: userId,
  });
}

export async function updateInvoice(id: string, input: UpdateInvoiceInput) {
  const inv = await findOrThrow(Invoice, id, "Invoice");
  if (inv.status === "Paid")
    throw new AppError("Cannot modify a paid invoice", 400);
  return await inv.update(input);
}

export async function updateInvoiceStatus(
  id: string,
  input: UpdateStatusInput,
) {
  const inv = await findOrThrow(Invoice, id, "Invoice");
  const data: Record<string, unknown> = { status: input.status };
  if (input.status === "Paid")
    data.paidDate = input.paidDate || new Date().toISOString().split("T")[0];
  return await inv.update(data);
}

export async function deleteInvoice(id: string) {
  const inv = await findOrThrow(Invoice, id, "Invoice");
  if (inv.status === "Paid")
    throw new AppError("Cannot delete a paid invoice", 400);
  await inv.destroy();
  return { id };
}

// ══════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════

export async function listPayments(queryParams: PaymentQueryParams) {
  const { limit, offset, page, sort, order } = parsePagination(
    queryParams,
    "dueDate",
  );
  const where: Record<string, unknown> = {};
  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.paymentType) where.paymentType = queryParams.paymentType;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  const { count, rows } = await Payment.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [{ model: Player, as: "player", attributes: [...PLAYER_ATTRS] }],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function createPayment(input: CreatePaymentInput) {
  return await Payment.create(input);
}

export async function updatePaymentStatus(
  id: string,
  input: UpdateStatusInput,
) {
  const pay = await findOrThrow(Payment, id, "Payment");
  const data: Record<string, unknown> = { status: input.status };
  if (input.status === "Paid")
    data.paidDate = input.paidDate || new Date().toISOString().split("T")[0];
  if (input.reference) data.reference = input.reference;
  return await pay.update(data);
}

// ══════════════════════════════════════════
// LEDGER
// ══════════════════════════════════════════

export async function listLedger(queryParams: LedgerQueryParams) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "postedAt",
  );

  const where: Record<string | symbol, any> = {};
  if (queryParams.side) where.side = queryParams.side;
  if (queryParams.account)
    where.account = { [Op.iLike]: `%${queryParams.account}%` };
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (search) {
    where[Op.or] = [
      { description: { [Op.iLike]: `%${search}%` } },
      { account: { [Op.iLike]: `%${search}%` } },
    ];
  }
  const { count, rows } = await LedgerEntry.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [{ model: Player, as: "player", attributes: [...PLAYER_ATTRS] }],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function createLedgerEntry(
  input: CreateLedgerInput,
  userId: string,
) {
  return await LedgerEntry.create({ ...input, createdBy: userId });
}

// ── Create a balanced double-entry pair ──
export async function createLedgerPair(
  debitAccount: string,
  creditAccount: string,
  amount: number,
  description: string,
  refType: string,
  refId: string,
  playerId: string | null,
  userId: string,
) {
  const txId = randomUUID();
  const base = {
    transactionId: txId,
    amount,
    currency: "SAR",
    description,
    referenceType: refType,
    referenceId: refId,
    playerId,
    createdBy: userId,
  };
  await LedgerEntry.bulkCreate([
    { ...base, side: "Debit" as const, account: debitAccount },
    { ...base, side: "Credit" as const, account: creditAccount },
  ]);
  return txId;
}

// ══════════════════════════════════════════
// VALUATIONS
// ══════════════════════════════════════════

export async function listValuations(queryParams: ValuationQueryParams) {
  const { limit, offset, page, sort, order } = parsePagination(
    queryParams,
    "valuedAt",
  );
  const where: Record<string, unknown> = {};
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  const { count, rows } = await Valuation.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [{ model: Player, as: "player", attributes: [...PLAYER_ATTRS] }],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function createValuation(input: CreateValuationInput) {
  await findOrThrow(Player, input.playerId, "Player");

  // Auto-compute trend from previous valuation
  const prev = await Valuation.findOne({
    where: { playerId: input.playerId },
    order: [["valued_at", "DESC"]],
  });
  if (prev && !input.trend) {
    const prevVal = Number(prev.value);
    if (input.value > prevVal) {
      input.trend = "up";
      input.changePct = (((input.value - prevVal) / prevVal) * 100).toFixed(2);
    } else if (input.value < prevVal) {
      input.trend = "down";
      input.changePct = (((input.value - prevVal) / prevVal) * 100).toFixed(2);
    } else {
      input.trend = "stable";
      input.changePct = 0;
    }
  }

  return await Valuation.create({
    ...input,
    changePct: input.changePct != null ? Number(input.changePct) : undefined,
  });
}

// ══════════════════════════════════════════
// FINANCE SUMMARY (for KPIs + overview)
// ══════════════════════════════════════════

// ══════════════════════════════════════════
// FINANCIAL DASHBOARD (PRD enhanced)
// ══════════════════════════════════════════

export async function getFinancialDashboard(
  playerContractType?: string,
  comparisonPeriod: "MoM" | "QoQ" | "YoY" = "MoM",
) {
  const cacheKey = buildCacheKey(`${CachePrefix.FINANCE}:dashboard`, {
    playerContractType,
    comparisonPeriod,
  });

  return cacheOrFetch(
    cacheKey,
    async () => {
      // Build optional contract-type filter for player queries
      const typeFilter = playerContractType ? "AND contract_type = $1" : "";
      const typeBind = playerContractType ? { bind: [playerContractType] } : {};

      // Total portfolio market value
      const [marketValue] = await sequelize.query<MarketValueRow>(
        `SELECT COALESCE(SUM(market_value), 0)::NUMERIC AS total_market_value,
            COUNT(*)::INT AS total_players
     FROM players WHERE status = 'active' ${typeFilter}`,
        { type: QueryTypes.SELECT, ...typeBind },
      );

      // Player distribution by contract type
      const distribution = await sequelize.query<DistributionRow>(
        `SELECT contract_type, COUNT(*)::INT AS count
     FROM players WHERE status = 'active' ${typeFilter}
     GROUP BY contract_type ORDER BY count DESC`,
        { type: QueryTypes.SELECT, ...typeBind },
      );

      // Expected vs collected commissions
      const commissionTypeJoin = playerContractType
        ? "JOIN players p ON c.player_id = p.id AND p.contract_type = $1"
        : "";
      const commissionPayJoin = playerContractType
        ? "JOIN contracts cc ON pay.contract_id = cc.id JOIN players pp ON cc.player_id = pp.id AND pp.contract_type = $1"
        : "";
      const [commissions] = await sequelize.query<CommissionsRow>(
        `SELECT
       COALESCE(SUM(CASE WHEN c.total_commission ~ '^[0-9.]+$' THEN c.total_commission::NUMERIC ELSE 0 END), 0) AS expected_commissions,
       (SELECT COALESCE(SUM(pay.amount), 0)::NUMERIC FROM payments pay
        ${commissionPayJoin}
        WHERE pay.status = 'Paid' AND pay.payment_type = 'Commission') AS collected_commissions,
       (SELECT COALESCE(SUM(pay.amount), 0)::NUMERIC FROM payments pay
        ${commissionPayJoin}
        WHERE pay.status IN ('Expected', 'Overdue') AND pay.payment_type = 'Commission') AS outstanding_commissions
     FROM contracts c ${commissionTypeJoin}
     WHERE c.status IN ('Active', 'Expiring Soon')`,
        { type: QueryTypes.SELECT, ...typeBind },
      );

      // Top 10 valued players
      const topPlayers = await sequelize.query<TopPlayerRow>(
        `SELECT p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
            p.market_value, p.market_value_currency, p.position, p.photo_url,
            c.name AS club_name, c.name_ar AS club_name_ar
     FROM players p
     LEFT JOIN clubs c ON p.current_club_id = c.id
     WHERE p.status = 'active' AND p.market_value IS NOT NULL ${typeFilter}
     ORDER BY p.market_value DESC LIMIT 10`,
        { type: QueryTypes.SELECT, ...typeBind },
      );

      // Market value trend (monthly for last 12 months from valuations)
      const trendTypeJoin = playerContractType
        ? "JOIN players p ON v.player_id = p.id AND p.contract_type = $1"
        : "";
      const marketValueTrend = await sequelize.query<MarketValueTrendRow>(
        `SELECT TO_CHAR(DATE_TRUNC('month', v.valued_at), 'YYYY-MM') AS month,
            SUM(v.value)::NUMERIC AS total_value,
            COUNT(DISTINCT v.player_id)::INT AS players_valued
     FROM valuations v
     ${trendTypeJoin}
     WHERE v.valued_at >= DATE_TRUNC('month', NOW()) - INTERVAL '12 months'
     GROUP BY DATE_TRUNC('month', v.valued_at)
     ORDER BY month`,
        { type: QueryTypes.SELECT, ...typeBind },
      );

      // Revenue by club (top 10 clubs by paid invoice revenue)
      const revenueByClub = await sequelize.query<RevenueByClubRow>(
        `SELECT c.id AS club_id, c.name AS club_name, c.name_ar AS club_name_ar, c.logo_url,
            COALESCE(SUM(i.total_amount), 0)::NUMERIC AS total_revenue,
            COUNT(*)::INT AS invoice_count
     FROM invoices i
     JOIN clubs c ON i.club_id = c.id
     WHERE i.status = 'Paid'
     GROUP BY c.id, c.name, c.name_ar, c.logo_url
     ORDER BY total_revenue DESC
     LIMIT 10`,
        { type: QueryTypes.SELECT },
      );

      // Per-player revenue breakdown (top 20 by paid payments)
      const playerTypeJoin = playerContractType
        ? "AND p.contract_type = $1"
        : "";
      const playerRevenueBreakdown = await sequelize.query<PlayerRevenueRow>(
        `SELECT p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar, p.photo_url,
            c.name AS club_name, c.name_ar AS club_name_ar,
            COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_type = 'Commission'), 0)::NUMERIC AS commissions,
            COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_type = 'Sponsorship'), 0)::NUMERIC AS sponsorship,
            COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_type = 'Bonus'), 0)::NUMERIC AS bonus,
            COALESCE(SUM(pay.amount), 0)::NUMERIC AS total_revenue
     FROM payments pay
     JOIN players p ON pay.player_id = p.id ${playerTypeJoin}
     LEFT JOIN clubs c ON p.current_club_id = c.id
     WHERE pay.status = 'Paid'
     GROUP BY p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar, p.photo_url, c.name, c.name_ar
     ORDER BY total_revenue DESC
     LIMIT 20`,
        { type: QueryTypes.SELECT, ...typeBind },
      );

      // Cash flow timeline (-12 months to +6 months)
      const cashFlowTimeline = await sequelize.query<CashFlowRow>(
        `WITH months AS (
       SELECT TO_CHAR(d, 'YYYY-MM') AS month
       FROM generate_series(
         DATE_TRUNC('month', NOW()) - INTERVAL '12 months',
         DATE_TRUNC('month', NOW()) + INTERVAL '6 months',
         '1 month'
       ) d
     ),
     expected AS (
       SELECT TO_CHAR(DATE_TRUNC('month', due_date), 'YYYY-MM') AS month,
              SUM(amount)::NUMERIC AS amount
       FROM payments
       WHERE due_date >= DATE_TRUNC('month', NOW()) - INTERVAL '12 months'
         AND due_date <= DATE_TRUNC('month', NOW()) + INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', due_date)
     ),
     received AS (
       SELECT TO_CHAR(DATE_TRUNC('month', paid_date), 'YYYY-MM') AS month,
              SUM(amount)::NUMERIC AS amount
       FROM payments
       WHERE status = 'Paid'
         AND paid_date >= DATE_TRUNC('month', NOW()) - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', paid_date)
     )
     SELECT m.month,
            COALESCE(e.amount, 0) AS expected,
            COALESCE(r.amount, 0) AS received
     FROM months m
     LEFT JOIN expected e ON m.month = e.month
     LEFT JOIN received r ON m.month = r.month
     ORDER BY m.month`,
        { type: QueryTypes.SELECT },
      );

      // Period comparison
      const periodComparison = await computePeriodComparison(comparisonPeriod);

      // Profitability
      const [revRow] = await sequelize.query<RevenueRow>(
        `SELECT COALESCE(SUM(amount), 0)::NUMERIC AS total_revenue
     FROM payments WHERE status = 'Paid'
       AND paid_date >= DATE_TRUNC('month', NOW()) - INTERVAL '12 months'`,
        { type: QueryTypes.SELECT },
      );
      const [expRow] = await sequelize.query<ExpenseTotalRow>(
        `SELECT COALESCE(SUM(amount), 0)::NUMERIC AS total_expenses
     FROM expenses
     WHERE date >= DATE_TRUNC('month', NOW()) - INTERVAL '12 months'`,
        { type: QueryTypes.SELECT },
      );
      const totalRevenue = Number(revRow?.total_revenue || 0);
      const totalExpenses = Number(expRow?.total_expenses || 0);
      const netProfit = totalRevenue - totalExpenses;

      return {
        totalMarketValue: marketValue?.total_market_value || 0,
        totalPlayers: marketValue?.total_players || 0,
        distribution,
        commissions: commissions || {},
        topPlayers,
        marketValueTrend,
        revenueByClub,
        playerRevenueBreakdown,
        cashFlowTimeline,
        periodComparison,
        profitability: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMarginPct:
            totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        },
      };
    },
    CacheTTL.MEDIUM,
  );
}

export async function getFinanceSummary(months = 12) {
  return cacheOrFetch(
    buildCacheKey(`${CachePrefix.FINANCE}:summary`, { months }),
    async () => {
      const [invoiceStats] = await sequelize.query<InvoiceStatsRow>(
        `
        SELECT
          SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END)::NUMERIC AS total_paid,
          SUM(CASE WHEN status = 'Expected' THEN total_amount ELSE 0 END)::NUMERIC AS total_pending,
          SUM(CASE WHEN status = 'Overdue' THEN total_amount ELSE 0 END)::NUMERIC AS total_overdue,
          COUNT(*) FILTER (WHERE status = 'Overdue')::INT AS overdue_count,
          COUNT(*)::INT AS total_invoices
        FROM invoices
      `,
        { type: QueryTypes.SELECT },
      );

      const upcomingPayments = await Payment.count({
        where: { status: "Expected" },
      });

      const revenueByMonth = await sequelize.query<RevenueByMonthRow>(
        `
        SELECT TO_CHAR(DATE_TRUNC('month', paid_date), 'YYYY-MM') AS month,
          SUM(amount)::NUMERIC AS paid
        FROM payments WHERE status = 'Paid' AND paid_date >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
        GROUP BY DATE_TRUNC('month', paid_date) ORDER BY month
      `,
        { bind: [months], type: QueryTypes.SELECT },
      );

      const revenueByType = await sequelize.query<RevenueByTypeRow>(
        `
        SELECT payment_type, SUM(amount)::NUMERIC AS total
        FROM payments WHERE status = 'Paid'
        GROUP BY payment_type ORDER BY total DESC
      `,
        { type: QueryTypes.SELECT },
      );

      return {
        ...(invoiceStats || {}),
        upcomingPayments,
        revenueByMonth,
        revenueByType,
      };
    },
    CacheTTL.MEDIUM,
  );
}

// ══════════════════════════════════════════
// PERIOD COMPARISON HELPER
// ══════════════════════════════════════════

async function computePeriodComparison(period: "MoM" | "QoQ" | "YoY") {
  const now = new Date();
  let currentStart: Date;
  let currentEnd: Date;
  let prevStart: Date;
  let prevEnd: Date;

  if (period === "MoM") {
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "QoQ") {
    const q = Math.floor(now.getMonth() / 3);
    currentStart = new Date(now.getFullYear(), q * 3, 1);
    currentEnd = new Date(now.getFullYear(), q * 3 + 3, 1);
    prevStart = new Date(now.getFullYear(), q * 3 - 3, 1);
    prevEnd = new Date(now.getFullYear(), q * 3, 1);
  } else {
    currentStart = new Date(now.getFullYear(), 0, 1);
    currentEnd = new Date(now.getFullYear() + 1, 0, 1);
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevEnd = new Date(now.getFullYear(), 0, 1);
  }

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const rows = await sequelize.query<PeriodComparisonRow>(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE paid_date >= $1 AND paid_date < $2), 0)::NUMERIC AS current_revenue,
       COALESCE(SUM(amount) FILTER (WHERE paid_date >= $3 AND paid_date < $4), 0)::NUMERIC AS previous_revenue,
       COALESCE(SUM(amount) FILTER (WHERE paid_date >= $1 AND paid_date < $2 AND payment_type = 'Commission'), 0)::NUMERIC AS current_commissions,
       COALESCE(SUM(amount) FILTER (WHERE paid_date >= $3 AND paid_date < $4 AND payment_type = 'Commission'), 0)::NUMERIC AS previous_commissions,
       COUNT(*) FILTER (WHERE paid_date >= $1 AND paid_date < $2)::INT AS current_count,
       COUNT(*) FILTER (WHERE paid_date >= $3 AND paid_date < $4)::INT AS previous_count
     FROM payments
     WHERE status = 'Paid' AND paid_date >= $3`,
    {
      type: QueryTypes.SELECT,
      bind: [fmt(currentStart), fmt(currentEnd), fmt(prevStart), fmt(prevEnd)],
    },
  );

  const r = rows[0] || {};
  const cur = {
    revenue: Number(r.current_revenue || 0),
    commissions: Number(r.current_commissions || 0),
    invoiceCount: Number(r.current_count || 0),
  };
  const prev = {
    revenue: Number(r.previous_revenue || 0),
    commissions: Number(r.previous_commissions || 0),
    invoiceCount: Number(r.previous_count || 0),
  };

  return {
    period,
    current: cur,
    previous: prev,
    deltas: {
      revenue: cur.revenue - prev.revenue,
      commissions: cur.commissions - prev.commissions,
      invoiceCount: cur.invoiceCount - prev.invoiceCount,
    },
  };
}

// ══════════════════════════════════════════
// EXPENSES
// ══════════════════════════════════════════

export async function listExpenses(queryParams: ExpenseQueryParams) {
  const { limit, offset, page, sort, order } = parsePagination(
    queryParams,
    "date",
  );
  const where: Record<string, unknown> = {};
  if (queryParams.category) where.category = queryParams.category;
  if (queryParams.playerId) where.playerId = queryParams.playerId;

  const { count, rows } = await Expense.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [{ model: Player, as: "player", attributes: [...PLAYER_ATTRS] }],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function createExpense(input: CreateExpenseInput, userId: string) {
  return Expense.create({ ...input, createdBy: userId });
}

export async function updateExpense(
  id: string,
  input: Partial<CreateExpenseInput>,
) {
  const exp = await findOrThrow(Expense, id, "Expense");
  return exp.update(input);
}

export async function deleteExpense(id: string) {
  return destroyById(Expense, id, "Expense");
}
