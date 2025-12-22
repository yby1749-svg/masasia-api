import {apiClient} from './client';

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  getNotifications: (params?: {unreadOnly?: boolean; limit?: number}) =>
    apiClient.get<{data: NotificationItem[]}>('/notifications', {params}),

  getUnreadCount: () =>
    apiClient.get<{data: {count: number}}>('/notifications/unread-count'),

  markAsRead: (notificationId: string) =>
    apiClient.patch(`/notifications/${notificationId}/read`),

  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
};
