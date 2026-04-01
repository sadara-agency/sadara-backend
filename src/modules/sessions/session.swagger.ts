/**
 * @swagger
 * tags:
 *   - name: Sessions
 *     description: Player development session management
 *
 * /sessions:
 *   get:
 *     tags: [Sessions]
 *     summary: List sessions (with filters & pagination)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [created_at, updated_at, session_date, completion_status, program_owner], default: session_date }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by player name
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: referralId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sessionType
 *         schema: { type: string, enum: [Physical, Skill, Tactical, Mental, Nutrition, PerformanceAssessment, Goalkeeper] }
 *       - in: query
 *         name: programOwner
 *         schema: { type: string, enum: [FitnessCoach, Coach, SkillCoach, TacticalCoach, GoalkeeperCoach, Analyst, NutritionSpecialist, MentalCoach] }
 *       - in: query
 *         name: completionStatus
 *         schema: { type: string, enum: [Scheduled, Completed, Cancelled, NoShow] }
 *       - in: query
 *         name: responsibleId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Paginated list of sessions
 *   post:
 *     tags: [Sessions]
 *     summary: Create a new session
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, referralId, sessionType, programOwner, sessionDate]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               referralId: { type: string, format: uuid }
 *               sessionType: { type: string, enum: [Physical, Skill, Tactical, Mental, Nutrition, PerformanceAssessment, Goalkeeper] }
 *               programOwner: { type: string, enum: [FitnessCoach, Coach, SkillCoach, TacticalCoach, GoalkeeperCoach, Analyst, NutritionSpecialist, MentalCoach] }
 *               responsibleId: { type: string, format: uuid }
 *               sessionDate: { type: string, format: date }
 *               notes: { type: string }
 *               notesAr: { type: string }
 *               completionStatus: { type: string, enum: [Scheduled, Completed, Cancelled, NoShow], default: Scheduled }
 *     responses:
 *       201: { description: Session created }
 *
 * /sessions/stats:
 *   get:
 *     tags: [Sessions]
 *     summary: Get session statistics (aggregated by type, status, owner)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Session statistics }
 *
 * /sessions/referral/{referralId}:
 *   get:
 *     tags: [Sessions]
 *     summary: List sessions linked to a referral
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: referralId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Sessions for the referral }
 *
 * /sessions/player/{playerId}:
 *   get:
 *     tags: [Sessions]
 *     summary: List sessions for a player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Sessions for the player }
 *
 * /sessions/{id}:
 *   get:
 *     tags: [Sessions]
 *     summary: Get session by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Session details }
 *       404: { description: Session not found }
 *   patch:
 *     tags: [Sessions]
 *     summary: Update a session
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionType: { type: string, enum: [Physical, Skill, Tactical, Mental, Nutrition, PerformanceAssessment, Goalkeeper] }
 *               programOwner: { type: string, enum: [FitnessCoach, Coach, SkillCoach, TacticalCoach, GoalkeeperCoach, Analyst, NutritionSpecialist, MentalCoach] }
 *               responsibleId: { type: string, format: uuid, nullable: true }
 *               sessionDate: { type: string, format: date }
 *               notes: { type: string, nullable: true }
 *               notesAr: { type: string, nullable: true }
 *               completionStatus: { type: string, enum: [Scheduled, Completed, Cancelled, NoShow] }
 *     responses:
 *       200: { description: Session updated }
 *       404: { description: Session not found }
 *   delete:
 *     tags: [Sessions]
 *     summary: Delete a session
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Session deleted }
 *       404: { description: Session not found }
 */
