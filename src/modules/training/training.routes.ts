import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCourseSchema, updateCourseSchema, enrollPlayersSchema, updateEnrollmentSchema } from './training.schema';
import * as ctrl from './training.controller';

const router = Router();
router.use(authenticate);

// Courses
router.get('/', asyncHandler(ctrl.listCourses));
router.get('/player/:playerId', asyncHandler(ctrl.playerEnrollments));
router.get('/:id', asyncHandler(ctrl.getCourse));
router.post('/', validate(createCourseSchema), asyncHandler(ctrl.createCourse));
router.patch('/:id', validate(updateCourseSchema), asyncHandler(ctrl.updateCourse));
router.delete('/:id', authorize('Admin', 'Manager'), asyncHandler(ctrl.deleteCourse));

// Enrollments
router.post('/:id/enroll', validate(enrollPlayersSchema), asyncHandler(ctrl.enrollPlayers));
router.patch('/enrollments/:enrollmentId', validate(updateEnrollmentSchema), asyncHandler(ctrl.updateEnrollment));
router.delete('/enrollments/:enrollmentId', asyncHandler(ctrl.removeEnrollment));

export default router;