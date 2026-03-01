import { Op, Sequelize } from 'sequelize';
import { TrainingCourse, TrainingEnrollment } from './training.model';
import { Player } from '../players/player.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import type { CreateCourseInput, UpdateCourseInput, UpdateEnrollmentInput } from './training.schema';

const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'position', 'photoUrl'] as const;

// ── Courses ──

export async function listCourses(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'createdAt');
  const where: any = {};

  if (queryParams.category) where.category = queryParams.category;
  if (queryParams.isActive !== undefined) where.isActive = queryParams.isActive === 'true';
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { titleAr: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await TrainingCourse.findAndCountAll({
    where, limit, offset,
    order: [[sort, order]],
    attributes: {
      include: [
        [Sequelize.literal(`(SELECT COUNT(*) FROM training_enrollments WHERE training_enrollments.course_id = "TrainingCourse".id)`), 'enrollmentCount'],
        [Sequelize.literal(`(SELECT COUNT(*) FROM training_enrollments WHERE training_enrollments.course_id = "TrainingCourse".id AND training_enrollments.status = 'Completed')`), 'completedCount'],
      ],
    },
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getCourseById(id: string) {
  const course = await TrainingCourse.findByPk(id, {
    include: [{
      model: TrainingEnrollment, as: 'enrollments',
      include: [{ model: Player, as: 'player', attributes: [...PLAYER_ATTRS] }],
    }],
  });
  if (!course) throw new AppError('Course not found', 404);
  return course;
}

export async function createCourse(input: CreateCourseInput, createdBy: string) {
  return TrainingCourse.create({ ...input, createdBy } as any);
}

export async function updateCourse(id: string, input: UpdateCourseInput) {
  const course = await TrainingCourse.findByPk(id);
  if (!course) throw new AppError('Course not found', 404);
  return course.update(input as any);
}

export async function deleteCourse(id: string) {
  const course = await TrainingCourse.findByPk(id);
  if (!course) throw new AppError('Course not found', 404);
  await course.destroy();
  return { id };
}

// ── Enrollments ──

export async function enrollPlayers(courseId: string, playerIds: string[], assignedBy: string) {
  const course = await TrainingCourse.findByPk(courseId);
  if (!course) throw new AppError('Course not found', 404);

  const existing = await Player.findAll({
    where: { id: { [Op.in]: playerIds } },
    attributes: ['id'],
  });
  if (existing.length !== playerIds.length) {
    throw new AppError('Some players not found', 404);
  }

  const records = playerIds.map(playerId => ({
    courseId, playerId, assignedBy,
  }));

  await TrainingEnrollment.bulkCreate(records as any, {
    updateOnDuplicate: ['assignedBy', 'updatedAt'],
  });

  return getCourseById(courseId);
}

export async function updateEnrollment(enrollmentId: string, input: UpdateEnrollmentInput) {
  const enrollment = await TrainingEnrollment.findByPk(enrollmentId);
  if (!enrollment) throw new AppError('Enrollment not found', 404);

  const updates: any = { ...input };

  if (input.status === 'InProgress' && !enrollment.startedAt) {
    updates.startedAt = new Date();
  }
  if (input.status === 'Completed') {
    updates.completedAt = new Date();
    updates.progressPct = 100;
  }

  return enrollment.update(updates);
}

export async function removeEnrollment(enrollmentId: string) {
  const enrollment = await TrainingEnrollment.findByPk(enrollmentId);
  if (!enrollment) throw new AppError('Enrollment not found', 404);
  await enrollment.destroy();
  return { id: enrollmentId };
}

export async function getPlayerEnrollments(playerId: string) {
  return TrainingEnrollment.findAll({
    where: { playerId },
    include: [{ model: TrainingCourse, as: 'course' }],
    order: [['enrolledAt', 'DESC']],
  });
}