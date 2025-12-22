// ============================================================================
// Notifications Controller
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notifications.service.js';

export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notificationService.getNotifications(req.user!.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await notificationService.markAsRead(req.user!.id, req.params.notificationId);
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) { next(error); }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    res.json({ success: true, message: 'All marked as read' });
  } catch (error) { next(error); }
};
