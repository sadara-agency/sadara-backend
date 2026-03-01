import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse';
import * as svc from './notification.service';

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listNotifications(req.user!.id, req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function unreadCount(req: AuthRequest, res: Response) {
  const count = await svc.getUnreadCount(req.user!.id);
  sendSuccess(res, { count });
}

export async function markAsRead(req: AuthRequest, res: Response) {
  await svc.markAsRead(req.user!.id, req.params.id);
  sendSuccess(res, null, 'Marked as read');
}

export async function markAllAsRead(req: AuthRequest, res: Response) {
  const count = await svc.markAllAsRead(req.user!.id);
  sendSuccess(res, { count }, `${count} notifications marked as read`);
}

export async function dismiss(req: AuthRequest, res: Response) {
  await svc.dismissNotification(req.user!.id, req.params.id);
  sendSuccess(res, null, 'Notification dismissed');
}