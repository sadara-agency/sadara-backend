// ─────────────────────────────────────────────────────────────
// src/modules/clearances/clearance.routes.ts
// Express routes for clearance (مخالصة) endpoints.
// ─────────────────────────────────────────────────────────────
import { Router } from 'express';
import * as controller from './clearance.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
    createClearanceSchema,
    updateClearanceSchema,
    completeClearanceSchema,
    clearanceQuerySchema,
} from './clearance.schema';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET    /api/v1/clearances          — List all clearances
router.get('/', authorize('Admin', 'Manager'), validate(clearanceQuerySchema, 'query'), controller.list);

// GET    /api/v1/clearances/:id      — Get single clearance
router.get('/:id', authorize('Admin', 'Manager'), controller.getById);

// POST   /api/v1/clearances          — Create new clearance
router.post('/', authorize('Admin', 'Manager'), validate(createClearanceSchema), controller.create);

// PUT    /api/v1/clearances/:id      — Update clearance
router.put('/:id', authorize('Admin', 'Manager'), validate(updateClearanceSchema), controller.update);

// POST   /api/v1/clearances/:id/complete — Sign & complete clearance
router.post('/:id/complete', authorize('Admin', 'Manager'), validate(completeClearanceSchema), controller.complete);

// DELETE /api/v1/clearances/:id      — Delete clearance (Processing only)
router.delete('/:id', authorize('Admin'), controller.remove);

export default router;