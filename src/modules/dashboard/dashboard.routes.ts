import { Router, Response } from 'express';
import { query } from '../../config/database';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { AuthRequest } from '../../shared/types';
import { sendSuccess } from '../../shared/utils/apiResponse';

const router = Router();
router.use(authenticate);

// ── KPIs ──
router.get('/kpis', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await query('SELECT * FROM vw_dashboard_kpis');
  sendSuccess(res, result.rows[0]);
}));

// ── Smart Alerts ──
router.get('/alerts', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [expiringContracts, overduePayments, injuryConflicts, openReferrals] = await Promise.all([
    query('SELECT * FROM vw_expiring_contracts LIMIT 5'),
    query('SELECT * FROM vw_overdue_payments LIMIT 5'),
    query('SELECT * FROM vw_injury_match_conflicts LIMIT 5'),
    query(`SELECT r.*, p.first_name || ' ' || p.last_name AS player_name
           FROM referrals r JOIN players p ON r.player_id = p.id
           WHERE r.status IN ('Open','InProgress') ORDER BY r.created_at DESC LIMIT 5`),
  ]);

  sendSuccess(res, {
    expiringContracts: expiringContracts.rows,
    overduePayments: overduePayments.rows,
    injuryConflicts: injuryConflicts.rows,
    openReferrals: openReferrals.rows,
  });
}));

// ── Today's Overview ──
router.get('/today', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().split('T')[0];

  const [matches, tasks, payments] = await Promise.all([
    query(
      `SELECT m.*, hc.name as home_team, ac.name as away_team
       FROM matches m LEFT JOIN clubs hc ON m.home_club_id = hc.id LEFT JOIN clubs ac ON m.away_club_id = ac.id
       WHERE DATE(m.match_date) = $1 ORDER BY m.match_date`, [today]
    ),
    query(
      `SELECT t.*, p.first_name || ' ' || p.last_name AS player_name, u.full_name AS assigned_to_name
       FROM tasks t LEFT JOIN players p ON t.player_id = p.id LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.due_date = $1 AND t.status != 'Completed' ORDER BY t.priority DESC`, [today]
    ),
    query(
      `SELECT py.*, p.first_name || ' ' || p.last_name AS player_name
       FROM payments py LEFT JOIN players p ON py.player_id = p.id
       WHERE py.due_date = $1 AND py.status != 'Paid' ORDER BY py.amount DESC`, [today]
    ),
  ]);

  sendSuccess(res, { matches: matches.rows, tasks: tasks.rows, payments: payments.rows });
}));

// ── Recent Activity ──
router.get('/activity', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await query('SELECT * FROM audit_logs ORDER BY logged_at DESC LIMIT 20');
  sendSuccess(res, result.rows);
}));

export default router;
