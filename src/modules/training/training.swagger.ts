/**
 * @swagger
 * tags:
 *   - name: Training
 *     description: Training courses, enrollments, and player development
 *
 * /training/my:
 *   get:
 *     tags: [Training]
 *     summary: Get my enrollments (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Player's assigned courses }
 *
 * /training/my/enrollments/{enrollmentId}/track:
 *   post:
 *     tags: [Training]
 *     summary: Track a content interaction (Player)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [activityType]
 *             properties:
 *               activityType: { type: string, example: VideoCompleted }
 *               contentId: { type: string }
 *     responses:
 *       200: { description: Activity tracked }
 *
 * /training/my/enrollments/{enrollmentId}/progress:
 *   patch:
 *     tags: [Training]
 *     summary: Update my progress (Player)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               progressPct: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       200: { description: Progress updated }
 *
 * /training/admin/completion-matrix:
 *   get:
 *     tags: [Training]
 *     summary: Completion matrix (Admin/Manager/Coach)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Matrix of players vs courses with completion status }
 *
 * /training:
 *   get:
 *     tags: [Training]
 *     summary: List courses
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of training courses }
 *   post:
 *     tags: [Training]
 *     summary: Create a course
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               titleAr: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               content: { type: object }
 *     responses:
 *       201: { description: Course created }
 *
 * /training/player/{playerId}:
 *   get:
 *     tags: [Training]
 *     summary: Get player enrollments
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Player enrollments }
 *
 * /training/{id}:
 *   get:
 *     tags: [Training]
 *     summary: Get course by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Course details }
 *   patch:
 *     tags: [Training]
 *     summary: Update course
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
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *     responses:
 *       200: { description: Course updated }
 *   delete:
 *     tags: [Training]
 *     summary: Delete course (Admin/Manager/Coach)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Course deleted }
 *
 * /training/{id}/enroll:
 *   post:
 *     tags: [Training]
 *     summary: Enroll players in a course
 *     security: [{ bearerAuth: [] }]
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
 *             required: [playerIds]
 *             properties:
 *               playerIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       201: { description: Players enrolled }
 *
 * /training/enrollments/{enrollmentId}:
 *   patch:
 *     tags: [Training]
 *     summary: Update enrollment (admin manage)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *               progressPct: { type: number }
 *     responses:
 *       200: { description: Enrollment updated }
 *   delete:
 *     tags: [Training]
 *     summary: Remove enrollment
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Enrollment removed }
 *
 * /training/{id}/modules:
 *   get:
 *     tags: [Training]
 *     summary: List modules in a course
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ordered list of course modules }
 *   post:
 *     tags: [Training]
 *     summary: Create a module in a course (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
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
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               titleAr: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Module created }
 *
 * /training/{id}/modules/reorder:
 *   post:
 *     tags: [Training]
 *     summary: Reorder modules in a course
 *     security: [{ bearerAuth: [] }]
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
 *             required: [orderedIds]
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200: { description: Modules reordered }
 *
 * /training/modules/{moduleId}:
 *   patch:
 *     tags: [Training]
 *     summary: Update a module
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               titleAr: { type: string }
 *               description: { type: string }
 *     responses:
 *       200: { description: Module updated }
 *   delete:
 *     tags: [Training]
 *     summary: Delete a module
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Module deleted }
 *
 * /training/modules/{moduleId}/lessons:
 *   post:
 *     tags: [Training]
 *     summary: Create a lesson in a module (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               titleAr: { type: string }
 *               type: { type: string, enum: [Video, Article, Quiz, Exercise] }
 *               durationMin: { type: integer }
 *     responses:
 *       201: { description: Lesson created }
 *
 * /training/modules/{moduleId}/lessons/reorder:
 *   post:
 *     tags: [Training]
 *     summary: Reorder lessons in a module
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderedIds]
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200: { description: Lessons reordered }
 *
 * /training/lessons/{lessonId}:
 *   patch:
 *     tags: [Training]
 *     summary: Update a lesson
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               type: { type: string }
 *               durationMin: { type: integer }
 *     responses:
 *       200: { description: Lesson updated }
 *   delete:
 *     tags: [Training]
 *     summary: Delete a lesson
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Lesson deleted }
 *
 * /training/lessons/{lessonId}/media:
 *   post:
 *     tags: [Training]
 *     summary: Upload media file for a lesson (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: Media uploaded, signed URL returned }
 *
 * /training/media/{mediaId}/stream:
 *   get:
 *     tags: [Training]
 *     summary: Get signed streaming URL for lesson media (Player/Coach)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Signed URL valid for streaming }
 *
 * /training/my/enrollments/{enrollmentId}/lessons:
 *   get:
 *     tags: [Training]
 *     summary: Get lesson progress for an enrollment (Player)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Lesson progress list for the enrollment }
 *
 * /training/my/enrollments/{enrollmentId}/lessons/{lessonId}:
 *   patch:
 *     tags: [Training]
 *     summary: Update lesson progress (Player)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               progressPct: { type: number, minimum: 0, maximum: 100 }
 *               lastPosition: { type: number }
 *     responses:
 *       200: { description: Progress updated }
 *
 * /training/my/enrollments/{enrollmentId}/lessons/complete:
 *   post:
 *     tags: [Training]
 *     summary: Mark a lesson as complete (Player)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonId]
 *             properties:
 *               lessonId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Lesson marked complete; enrollment progress updated }
 *
 * /training/analytics:
 *   get:
 *     tags: [Training]
 *     summary: Platform-wide training analytics (Admin/Manager/Coach)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Aggregate completion rates, active learners, popular courses }
 */
