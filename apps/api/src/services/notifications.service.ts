// ============================================================================
// Notifications Service
// ============================================================================

import { Prisma, NotificationType } from '@prisma/client';
import { prisma } from '../config/database.js';

interface NotificationQuery {
  unreadOnly?: string;
  limit?: string;
}

class NotificationService {
  async getNotifications(userId: string, query: NotificationQuery) {
    const where: Prisma.NotificationWhereInput = { userId };
    if (query.unreadOnly === 'true') where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit || '20'),
    });
    return { data: notifications, pagination: { page: 1, limit: 20, total: notifications.length } };
  }

  async markAsRead(userId: string, notificationId: string) {
    await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  async createNotification(userId: string, type: string, title: string, body: string, data?: Prisma.InputJsonValue) {
    return prisma.notification.create({ data: { userId, type: type as NotificationType, title, body, data } });
  }
}

export const notificationService = new NotificationService();
