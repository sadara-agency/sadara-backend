/**
 * @swagger
 * tags:
 *   - name: Wellness
 *     description: Player wellness — profiles, nutrition, weight tracking, meal logs, and readiness check-ins
 *
 * /wellness/my/profile:
 *   get:
 *     tags: [Wellness]
 *     summary: Get own wellness profile (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Player's wellness profile }
 *
 * /wellness/my/macros:
 *   get:
 *     tags: [Wellness]
 *     summary: Compute own daily macro targets (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Macro targets (calories, protein, carbs, fat) }
 *
 * /wellness/my/weight:
 *   get:
 *     tags: [Wellness]
 *     summary: List own weight log entries (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated weight log entries }
 *   post:
 *     tags: [Wellness]
 *     summary: Log own body weight (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [weightKg, logDate]
 *             properties:
 *               weightKg: { type: number }
 *               logDate: { type: string, format: date }
 *               note: { type: string }
 *     responses:
 *       201: { description: Weight log created }
 *
 * /wellness/my/weight/trend:
 *   get:
 *     tags: [Wellness]
 *     summary: Get own weight trend (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Weight trend data with 7-day moving average }
 *
 * /wellness/my/meals:
 *   get:
 *     tags: [Wellness]
 *     summary: List own meal log entries (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated meal entries }
 *   post:
 *     tags: [Wellness]
 *     summary: Log a meal (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mealType, logDate]
 *             properties:
 *               mealType: { type: string, enum: [Breakfast, Lunch, Dinner, Snack] }
 *               logDate: { type: string, format: date }
 *               items: { type: array, items: { type: object } }
 *     responses:
 *       201: { description: Meal log created }
 *
 * /wellness/my/meals/copy-day:
 *   post:
 *     tags: [Wellness]
 *     summary: Copy all meals from one date to another (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromDate, toDate]
 *             properties:
 *               fromDate: { type: string, format: date }
 *               toDate: { type: string, format: date }
 *     responses:
 *       201: { description: Meals copied }
 *
 * /wellness/my/meals/daily-totals:
 *   get:
 *     tags: [Wellness]
 *     summary: Get own daily macro totals (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Aggregate macro totals for the day }
 *
 * /wellness/my/checkin:
 *   post:
 *     tags: [Wellness]
 *     summary: Submit daily readiness check-in (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sleepHours, energyLevel, moodScore]
 *             properties:
 *               sleepHours: { type: number }
 *               energyLevel: { type: integer, minimum: 1, maximum: 10 }
 *               moodScore: { type: integer, minimum: 1, maximum: 10 }
 *               stressLevel: { type: integer, minimum: 1, maximum: 10 }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Check-in recorded }
 *
 * /wellness/my/checkin/today:
 *   get:
 *     tags: [Wellness]
 *     summary: Get own check-in for today (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Today's check-in or null }
 *
 * /wellness/my/checkins:
 *   get:
 *     tags: [Wellness]
 *     summary: List own check-in history (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated check-in history }
 *
 * /wellness/my/checkins/trend:
 *   get:
 *     tags: [Wellness]
 *     summary: Get own readiness trend (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 28 }
 *     responses:
 *       200: { description: Trend data for energy, mood, sleep, stress }
 *
 * /wellness/my/dashboard:
 *   get:
 *     tags: [Wellness]
 *     summary: Get own wellness ring dashboard (Player self-service)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 7 }
 *     responses:
 *       200: { description: Aggregated rings for calories, hydration, activity, sleep }
 *
 * /wellness/profiles/{playerId}:
 *   get:
 *     tags: [Wellness]
 *     summary: Get wellness profile for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Player wellness profile }
 *       404: { description: Profile not found }
 *   patch:
 *     tags: [Wellness]
 *     summary: Update a player's wellness profile (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               heightCm: { type: number }
 *               targetWeightKg: { type: number }
 *               activityLevel: { type: string }
 *     responses:
 *       200: { description: Profile updated }
 *
 * /wellness/profiles:
 *   post:
 *     tags: [Wellness]
 *     summary: Create a wellness profile for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               heightCm: { type: number }
 *               targetWeightKg: { type: number }
 *               activityLevel: { type: string, enum: [Sedentary, Light, Moderate, Active, VeryActive] }
 *               dietaryRestrictions: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Profile created }
 *
 * /wellness/profiles/{playerId}/macros:
 *   get:
 *     tags: [Wellness]
 *     summary: Compute macro targets for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Macro targets }
 *
 * /wellness/profiles/{playerId}/recalculate:
 *   post:
 *     tags: [Wellness]
 *     summary: Recalculate nutrition targets based on latest profile data (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Targets recalculated }
 *
 * /wellness/weight/{playerId}:
 *   get:
 *     tags: [Wellness]
 *     summary: List weight logs for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Paginated weight log entries }
 *
 * /wellness/weight:
 *   post:
 *     tags: [Wellness]
 *     summary: Log weight for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, weightKg, logDate]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               weightKg: { type: number }
 *               logDate: { type: string, format: date }
 *               note: { type: string }
 *     responses:
 *       201: { description: Weight logged }
 *
 * /wellness/weight/{playerId}/trend:
 *   get:
 *     tags: [Wellness]
 *     summary: Get weight trend for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Weight trend with moving average }
 *
 * /wellness/food/search:
 *   get:
 *     tags: [Wellness]
 *     summary: Search food items from Nutritionix or local DB
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search query (e.g. "chicken breast")
 *     responses:
 *       200: { description: List of matching food items with nutritional data }
 *
 * /wellness/food/{id}:
 *   get:
 *     tags: [Wellness]
 *     summary: Get a food item by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Food item details }
 *
 * /wellness/food:
 *   post:
 *     tags: [Wellness]
 *     summary: Create a custom food item
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, caloriesPer100g]
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string }
 *               caloriesPer100g: { type: number }
 *               proteinPer100g: { type: number }
 *               carbsPer100g: { type: number }
 *               fatPer100g: { type: number }
 *     responses:
 *       201: { description: Food item created }
 *
 * /wellness/meals/{playerId}:
 *   get:
 *     tags: [Wellness]
 *     summary: List meal logs for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Paginated meal log entries }
 *
 * /wellness/meals:
 *   post:
 *     tags: [Wellness]
 *     summary: Log a meal for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, mealType, logDate]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               mealType: { type: string, enum: [Breakfast, Lunch, Dinner, Snack] }
 *               logDate: { type: string, format: date }
 *               items: { type: array, items: { type: object } }
 *     responses:
 *       201: { description: Meal logged }
 *
 * /wellness/meals/copy-day:
 *   post:
 *     tags: [Wellness]
 *     summary: Copy meals from one date to another for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, fromDate, toDate]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               fromDate: { type: string, format: date }
 *               toDate: { type: string, format: date }
 *     responses:
 *       201: { description: Meals copied }
 *
 * /wellness/meals/{id}:
 *   patch:
 *     tags: [Wellness]
 *     summary: Update a meal log entry
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
 *               mealType: { type: string }
 *               items: { type: array, items: { type: object } }
 *     responses:
 *       200: { description: Meal log updated }
 *   delete:
 *     tags: [Wellness]
 *     summary: Delete a meal log entry
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Meal log deleted }
 *
 * /wellness/meals/{playerId}/daily-totals:
 *   get:
 *     tags: [Wellness]
 *     summary: Get daily macro totals for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Aggregate macro totals for the specified date }
 *
 * /wellness/dashboard/overview:
 *   get:
 *     tags: [Wellness]
 *     summary: Coach squad wellness overview
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Summary stats across all assigned players }
 *
 * /wellness/dashboard/heatmap:
 *   get:
 *     tags: [Wellness]
 *     summary: Coach wellness heatmap (readiness by player by day)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 14 }
 *     responses:
 *       200: { description: Heatmap matrix — players × days with readiness scores }
 *
 * /wellness/dashboard/player/{playerId}:
 *   get:
 *     tags: [Wellness]
 *     summary: Wellness ring dashboard for a specific player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 7 }
 *     responses:
 *       200: { description: Player ring data and trend }
 *
 * /wellness/checkins:
 *   post:
 *     tags: [Wellness]
 *     summary: Record a check-in for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, sleepHours, energyLevel, moodScore]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               sleepHours: { type: number }
 *               energyLevel: { type: integer, minimum: 1, maximum: 10 }
 *               moodScore: { type: integer, minimum: 1, maximum: 10 }
 *               stressLevel: { type: integer, minimum: 1, maximum: 10 }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Check-in recorded }
 *
 * /wellness/checkins/{playerId}:
 *   get:
 *     tags: [Wellness]
 *     summary: List check-ins for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated check-in history }
 *
 * /wellness/checkins/{playerId}/trend:
 *   get:
 *     tags: [Wellness]
 *     summary: Get readiness trend for a player (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 28 }
 *     responses:
 *       200: { description: Trend data for energy, mood, sleep, stress }
 */
