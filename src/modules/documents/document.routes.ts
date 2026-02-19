import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDocumentSchema, updateDocumentSchema, documentQuerySchema } from './document.schema';
import * as ctrl from './document.controller';

const router = Router();
router.use(authenticate);

router.get('/', validate(documentQuerySchema, 'query'), asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', authorize('Admin', 'Manager', 'Analyst'), validate(createDocumentSchema), asyncHandler(ctrl.create));
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateDocumentSchema), asyncHandler(ctrl.update));
router.delete('/:id', authorize('Admin'), asyncHandler(ctrl.remove));

export default router;