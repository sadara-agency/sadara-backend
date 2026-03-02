import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import * as auditController from './audit.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('Admin', 'Manager'), asyncHandler(auditController.list));

export default router;
