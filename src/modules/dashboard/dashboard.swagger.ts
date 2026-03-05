/**
 * @swagger
 * tags:
 *   - name: Dashboard
 *     description: Aggregated dashboard data and analytics (cached)
 *
 * /dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Full aggregated dashboard
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Complete dashboard data }
 *
 * /dashboard/kpis:
 *   get:
 *     tags: [Dashboard]
 *     summary: Key Performance Indicators
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: KPI values }
 *
 * /dashboard/alerts:
 *   get:
 *     tags: [Dashboard]
 *     summary: Active alerts
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of alerts }
 *
 * /dashboard/today:
 *   get:
 *     tags: [Dashboard]
 *     summary: Today's overview
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Today overview }
 *
 * /dashboard/quick-stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Quick stats summary
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Quick stats }
 *
 * /dashboard/top-players:
 *   get:
 *     tags: [Dashboard]
 *     summary: Top-performing players
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Top players list }
 *
 * /dashboard/contracts/status:
 *   get:
 *     tags: [Dashboard]
 *     summary: Contract status breakdown
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Contracts by status }
 *
 * /dashboard/players/distribution:
 *   get:
 *     tags: [Dashboard]
 *     summary: Player distribution stats
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Distribution data }
 *
 * /dashboard/offers/recent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Recent offers
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Recent offers list }
 *
 * /dashboard/matches/upcoming:
 *   get:
 *     tags: [Dashboard]
 *     summary: Upcoming matches
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Upcoming matches list }
 *
 * /dashboard/tasks/urgent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Urgent tasks
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Urgent tasks list }
 *
 * /dashboard/revenue:
 *   get:
 *     tags: [Dashboard]
 *     summary: Revenue chart data
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Revenue time-series }
 *
 * /dashboard/performance:
 *   get:
 *     tags: [Dashboard]
 *     summary: Performance averages
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Performance averages }
 *
 * /dashboard/activity:
 *   get:
 *     tags: [Dashboard]
 *     summary: Recent activity feed
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Activity list }
 *
 * /dashboard/offer-pipeline:
 *   get:
 *     tags: [Dashboard]
 *     summary: Offer pipeline breakdown
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Pipeline data }
 *
 * /dashboard/injury-trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Injury trend data
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Injury trends }
 *
 * /dashboard/kpi-trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: KPI trends over time
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: KPI trend data }
 */
