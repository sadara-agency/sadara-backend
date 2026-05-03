/**
 * @swagger
 * tags:
 *   - name: Coach Dashboard
 *     description: Coach-scoped command-center aggregations (cached SHORT, per-user)
 *
 * /dashboard/coach/kpi-strip:
 *   get:
 *     tags: [Coach Dashboard]
 *     summary: KPI strip — today's sessions, assigned players, open alerts, pending tasks
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Four counters scoped to the authenticated coach }
 *       403: { description: Caller is not a coach role }
 *
 * /dashboard/coach/agenda:
 *   get:
 *     tags: [Coach Dashboard]
 *     summary: Today's chronological agenda — sessions + tasks due today
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: '{ items: [...] } — sessions and tasks scheduled for today' }
 *       403: { description: Caller is not a coach role }
 *
 * /dashboard/coach/alerts:
 *   get:
 *     tags: [Coach Dashboard]
 *     summary: Player non-compliance alerts grouped by category
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: '{ missedTraining, missedPulse, dietNonCompliance, openInjuries } — each up to 10 rows'
 *       403: { description: Caller is not a coach role }
 *
 * /dashboard/coach/attendance-trend:
 *   get:
 *     tags: [Coach Dashboard]
 *     summary: Squad attendance time-series (zero-filled)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 7, maximum: 90, default: 30 }
 *     responses:
 *       200:
 *         description: Array of '{ date, attended, missed, total, rate }' over the requested window
 *       403: { description: Caller is not a coach role }
 *
 * /dashboard/coach/task-velocity:
 *   get:
 *     tags: [Coach Dashboard]
 *     summary: Per-week task completion / overdue / created counts for the coach
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: weeks
 *         schema: { type: integer, minimum: 2, maximum: 26, default: 8 }
 *     responses:
 *       200:
 *         description: Array of '{ weekStart, completed, overdue, created }' over the requested window
 *       403: { description: Caller is not a coach role }
 */
export {};
