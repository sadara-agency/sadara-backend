import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
    createGateSchema,
    updateGateSchema,
    advanceGateSchema,
    createChecklistItemSchema,
    toggleChecklistItemSchema,
    gateQuerySchema,
} from './gate.schema';
import * as gateController from './gate.controller';

const router = Router();
router.use(authenticate);

// ── Gates CRUD ──
router.get('/', validate(gateQuerySchema, 'query'), asyncHandler(gateController.list));
router.get('/:id', asyncHandler(gateController.getById));
router.get('/player/:playerId', asyncHandler(gateController.getPlayerGates));

router.post('/', authorize('Admin', 'Manager'), validate(createGateSchema), asyncHandler(gateController.create));
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateGateSchema), asyncHandler(gateController.update));
router.patch('/:id/advance', authorize('Admin', 'Manager'), validate(advanceGateSchema), asyncHandler(gateController.advance));
router.delete('/:id', authorize('Admin'), asyncHandler(gateController.remove));

// ── Checklist Items ──
router.post('/:gateId/checklist', authorize('Admin', 'Manager'), validate(createChecklistItemSchema), asyncHandler(gateController.addChecklistItem));
router.patch('/checklist/:itemId', authorize('Admin', 'Manager', 'Analyst'), validate(toggleChecklistItemSchema), asyncHandler(gateController.toggleChecklistItem));
router.delete('/checklist/:itemId', authorize('Admin', 'Manager'), asyncHandler(gateController.deleteChecklistItem));

export default router;