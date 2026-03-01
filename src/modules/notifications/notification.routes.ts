import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './notification.controller';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(ctrl.list));
router.get('/unread-count', asyncHandler(ctrl.unreadCount));
router.patch('/read-all', asyncHandler(ctrl.markAllAsRead));
router.patch('/:id/read', asyncHandler(ctrl.markAsRead));
router.delete('/:id', asyncHandler(ctrl.dismiss));

export default router;