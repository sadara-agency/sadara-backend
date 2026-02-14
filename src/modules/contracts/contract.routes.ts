import { Router, Response } from 'express';
import { z } from 'zod';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/database';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';

const createContractSchema = z.object({
  playerId: z.string().uuid(),
  clubId: z.string().uuid(),
  category: z.enum(['Club', 'Sponsorship']).default('Club'),
  title: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baseSalary: z.number().positive().optional(),
  salaryCurrency: z.enum(['SAR', 'USD', 'EUR']).default('SAR'),
  signingBonus: z.number().min(0).default(0),
  releaseClause: z.number().positive().optional(),
  performanceBonus: z.number().min(0).default(0),
  commissionPct: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

const contractQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.enum(['Active', 'Expiring Soon', 'Expired', 'Draft']).optional(),
  category: z.enum(['Club', 'Sponsorship']).optional(),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
});

const router = Router();
router.use(authenticate);

// ── List ──
router.get('/', validate(contractQuerySchema, 'query'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const params = req.query as any;
  const { limit, offset, page, order } = parsePagination(params, 'created_at');

  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.status) { conditions.push(`c.status = $${idx++}`); values.push(params.status); }
  if (params.category) { conditions.push(`c.category = $${idx++}`); values.push(params.category); }
  if (params.playerId) { conditions.push(`c.player_id = $${idx++}`); values.push(params.playerId); }
  if (params.clubId) { conditions.push(`c.club_id = $${idx++}`); values.push(params.clubId); }
  if (params.search) {
    conditions.push(`(c.title ILIKE $${idx} OR p.first_name ILIKE $${idx} OR p.last_name ILIKE $${idx})`);
    values.push(`%${params.search}%`); idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult: any[] = await sequelize.query(`SELECT COUNT(*) FROM contracts c JOIN players p ON c.player_id = p.id ${where}`, { bind: values, type: QueryTypes.SELECT });
  const total = parseInt(countResult[0].count, 10);

  const result = await sequelize.query(
    `SELECT c.*, p.first_name || ' ' || p.last_name AS player_name, cl.name AS club_name, cl.logo_url AS club_logo,
       c.end_date - CURRENT_DATE AS days_remaining
     FROM contracts c
     JOIN players p ON c.player_id = p.id
     JOIN clubs cl ON c.club_id = cl.id
     ${where}
     ORDER BY c.created_at ${order}
     LIMIT $${idx++} OFFSET $${idx}`,
    { bind: [...values, limit, offset], type: QueryTypes.SELECT }
  );

  sendPaginated(res, result, buildMeta(total, page, limit));
}));

// ── Get by ID ──
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await sequelize.query(
    `SELECT c.*, p.first_name || ' ' || p.last_name AS player_name, cl.name AS club_name,
       c.end_date - CURRENT_DATE AS days_remaining
     FROM contracts c JOIN players p ON c.player_id = p.id JOIN clubs cl ON c.club_id = cl.id
     WHERE c.id = $1`,
    { bind: [req.params.id], type: QueryTypes.SELECT }
  );
  if (result.length === 0) throw new AppError('Contract not found', 404);

  const milestones = await sequelize.query(
    `SELECT ms.* FROM milestones ms JOIN commission_schedules cs ON ms.commission_schedule_id = cs.id
     WHERE cs.contract_id = $1 ORDER BY ms.due_date`,
    { bind: [req.params.id], type: QueryTypes.SELECT }
  );

  sendSuccess(res, { ...(result[0] as any), milestones });
}));

// ── Create ──
router.post('/', authorize('Admin', 'Manager'), validate(createContractSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const d = req.body;
  const totalCommission = d.commissionPct && d.baseSalary ? (d.baseSalary * d.commissionPct / 100) : 0;

  const result = await sequelize.query(
    `INSERT INTO contracts (player_id, club_id, category, title, start_date, end_date, base_salary, salary_currency,
       signing_bonus, release_clause, performance_bonus, commission_pct, total_commission, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    { bind: [d.playerId, d.clubId, d.category, d.title, d.startDate, d.endDate, d.baseSalary, d.salaryCurrency,
       d.signingBonus, d.releaseClause, d.performanceBonus, d.commissionPct, totalCommission, req.user!.id], type: QueryTypes.SELECT }
  );

  await logAudit('CREATE', 'contracts', (result[0] as any).id, buildAuditContext(req.user!, req.ip), `Created contract: ${d.title}`);
  sendCreated(res, result[0]);
}));

// ── Delete ──
router.delete('/:id', authorize('Admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await sequelize.query('DELETE FROM contracts WHERE id = $1 RETURNING id', { bind: [req.params.id], type: QueryTypes.SELECT });
  if (result.length === 0) throw new AppError('Contract not found', 404);
  await logAudit('DELETE', 'contracts', req.params.id, buildAuditContext(req.user!, req.ip));
  sendSuccess(res, { id: req.params.id }, 'Contract deleted');
}));

export default router;
