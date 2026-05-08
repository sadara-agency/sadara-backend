/**
 * @swagger
 * tags:
 *   name: MatchEvaluations
 *   description: Player post-match evaluation reports
 *
 * /match-evaluations:
 *   get:
 *     summary: List match evaluations
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: matchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Draft, PendingReview, Approved, NeedsRevision] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of evaluations
 *
 *   post:
 *     summary: Create a new evaluation (Draft)
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMatchEvaluation'
 *     responses:
 *       201:
 *         description: Evaluation created
 *
 * /match-evaluations/{id}:
 *   get:
 *     summary: Get evaluation by ID
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Evaluation detail
 *       404:
 *         description: Not found
 *
 *   patch:
 *     summary: Update evaluation (Draft or NeedsRevision only)
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Evaluation updated
 *
 *   delete:
 *     summary: Delete evaluation (Draft only)
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /match-evaluations/{id}/submit:
 *   post:
 *     summary: Submit evaluation for review
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Submitted (status → PendingReview)
 *
 * /match-evaluations/{id}/approve:
 *   post:
 *     summary: Approve evaluation (Sports Director / Manager / Admin)
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Approved — player summary updated
 *
 * /match-evaluations/{id}/revise:
 *   post:
 *     summary: Request revision from analyst
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [revisionComment]
 *             properties:
 *               revisionComment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status → NeedsRevision
 *
 * /match-evaluations/player/{playerId}/summary:
 *   get:
 *     summary: Get aggregated performance summary for a player
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Performance summary with trend
 */

export {};
