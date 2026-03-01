import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as svc from './training.service';

export async function listCourses(req: AuthRequest, res: Response) {
  const result = await svc.listCourses(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getCourse(req: AuthRequest, res: Response) {
  const course = await svc.getCourseById(req.params.id);
  sendSuccess(res, course);
}

export async function createCourse(req: AuthRequest, res: Response) {
  const course = await svc.createCourse(req.body, req.user!.id);
  await logAudit('CREATE', 'training', course.id, buildAuditContext(req.user!, req.ip), `Created course: ${course.title}`);
  sendCreated(res, course);
}

export async function updateCourse(req: AuthRequest, res: Response) {
  const course = await svc.updateCourse(req.params.id, req.body);
  sendSuccess(res, course, 'Course updated');
}

export async function deleteCourse(req: AuthRequest, res: Response) {
  const result = await svc.deleteCourse(req.params.id);
  await logAudit('DELETE', 'training', result.id, buildAuditContext(req.user!, req.ip), 'Course deleted');
  sendSuccess(res, result, 'Course deleted');
}

export async function enrollPlayers(req: AuthRequest, res: Response) {
  const course = await svc.enrollPlayers(req.params.id, req.body.playerIds, req.user!.id);
  await logAudit('UPDATE', 'training', req.params.id, buildAuditContext(req.user!, req.ip),
    `Enrolled ${req.body.playerIds.length} players`);
  sendSuccess(res, course, 'Players enrolled');
}

export async function updateEnrollment(req: AuthRequest, res: Response) {
  const enrollment = await svc.updateEnrollment(req.params.enrollmentId, req.body);
  sendSuccess(res, enrollment, 'Enrollment updated');
}

export async function removeEnrollment(req: AuthRequest, res: Response) {
  const result = await svc.removeEnrollment(req.params.enrollmentId);
  sendSuccess(res, result, 'Enrollment removed');
}

export async function playerEnrollments(req: AuthRequest, res: Response) {
  const enrollments = await svc.getPlayerEnrollments(req.params.playerId);
  sendSuccess(res, enrollments);
}