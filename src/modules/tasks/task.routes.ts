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

const createTaskSchema = z.object({
  title: z.string().min(1),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['Match', 'Contract', 'Health', 'Report', 'Offer', 'General']).default('General'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedTo: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

const taskQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['Open', 'InProgress', 'Completed']).optional(),
  type: z.enum(['Match', 'Contract', 'Health', 'Report', 'Offer', 'General']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTo: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
});

const router = Router();
router.use(authenticate);

// ── List ──
router.get('/', validate(taskQuerySchema, 'query'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const params = req.query as any;
  const { limit, offset, page } = parsePagination(params);

  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.status) { conditions.push(`t.status = $${idx++}`); values.push(params.status); }
  if (params.type) { conditions.push(`t.type = $${idx++}`); values.push(params.type); }
  if (params.priority) { conditions.push(`t.priority = $${idx++}`); values.push(params.priority); }
  if (params.assignedTo) { conditions.push(`t.assigned_to = $${idx++}`); values.push(params.assignedTo); }
  if (params.playerId) { conditions.push(`t.player_id = $${idx++}`); values.push(params.playerId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult: any[] = await sequelize.query(`SELECT COUNT(*) FROM tasks t ${where}`, { bind: values, type: QueryTypes.SELECT });
  const total = parseInt(countResult[0].count, 10);

  const result = await sequelize.query(
    `SELECT t.*, p.first_name || ' ' || p.last_name AS player_name, u.full_name AS assigned_to_name
     FROM tasks t LEFT JOIN players p ON t.player_id = p.id LEFT JOIN users u ON t.assigned_to = u.id
     ${where}
     ORDER BY CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       t.due_date ASC NULLS LAST
     LIMIT $${idx++} OFFSET $${idx}`,
    { bind: [...values, limit, offset], type: QueryTypes.SELECT }
  );

  sendPaginated(res, result, buildMeta(total, page, limit));
}));

// ── Get ──
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await sequelize.query(
    `SELECT t.*, p.first_name || ' ' || p.last_name AS player_name, u.full_name AS assigned_to_name
     FROM tasks t LEFT JOIN players p ON t.player_id = p.id LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id = $1`,
    { bind: [req.params.id], type: QueryTypes.SELECT }
  );
  if (result.length === 0) throw new AppError('Task not found', 404);
  sendSuccess(res, result[0]);
}));

// ── Create ──
router.post('/', validate(createTaskSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const d = req.body;
  const result = await sequelize.query(
    `INSERT INTO tasks (title, title_ar, description, type, priority, assigned_to, assigned_by, player_id, match_id, contract_id, due_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    { bind: [d.title, d.titleAr, d.description, d.type, d.priority, d.assignedTo, req.user!.id, d.playerId, d.matchId, d.contractId, d.dueDate, d.notes], type: QueryTypes.SELECT }
  );
  sendCreated(res, result[0]);
}));

// ── Update Status ──
router.patch('/:id/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!['Open', 'InProgress', 'Completed'].includes(status)) throw new AppError('Invalid status');

  const completedAt = status === 'Completed' ? 'NOW()' : 'NULL';
  const result = await sequelize.query(
    `UPDATE tasks SET status = $1, completed_at = ${completedAt} WHERE id = $2 RETURNING *`,
    { bind: [status, req.params.id], type: QueryTypes.SELECT }
  );
  if (result.length === 0) throw new AppError('Task not found', 404);
  sendSuccess(res, result[0], 'Task status updated');
}));

// ── Delete ──
router.delete('/:id', authorize('Admin', 'Manager'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await sequelize.query('DELETE FROM tasks WHERE id = $1 RETURNING id', { bind: [req.params.id], type: QueryTypes.SELECT });
  if (result.length === 0) throw new AppError('Task not found', 404);
  sendSuccess(res, { id: req.params.id }, 'Task deleted');
}));

export default router;
